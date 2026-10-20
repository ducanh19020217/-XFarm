'use client';

import * as React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export type Theme = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEYS = ['xfarm_theme', 'theme'] as const;

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    for (const key of STORAGE_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val === 'light' || val === 'dark' || val === 'system') {
        return val;
      }
    }
  } catch {
    // localStorage might be blocked
  }
  return 'system';
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);

  // Initialize theme from storage
  React.useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme() || defaultTheme;
    setThemeState(stored);
    const resolved = stored === 'system' ? getSystemPreference() : stored;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, [defaultTheme]);

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      for (const key of STORAGE_KEYS) {
        window.localStorage.setItem(key, nextTheme);
      }
    } catch {
      // ignore
    }

    const resolved = nextTheme === 'system' ? getSystemPreference() : nextTheme;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
      try {
        for (const key of STORAGE_KEYS) {
          window.localStorage.setItem(key, next);
        }
      } catch {
        // ignore
      }
      const resolved = next === 'system' ? getSystemPreference() : next;
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
      return next;
    });
  }, []);

  // Listen to prefers-color-scheme changes when in system mode
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = getStoredTheme();
      if (current === 'system') {
        const nextResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(nextResolved);
        applyThemeClass(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: mounted ? resolvedTheme : 'light',
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, mounted, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

export interface ThemeToggleProps {
  className?: string;
  align?: 'left' | 'right';
}

export function ThemeToggle({ className, align = 'right' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Current icon
  const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={menuRef}>
      <button
        type="button"
        data-testid="theme-toggle"
        data-theme={theme}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Chuyển đổi giao diện sáng/tối"
        aria-expanded={open}
        aria-haspopup="true"
        title="Đổi giao diện (Sáng / Tối / Hệ thống)"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg shadow-xs transition-colors hover:bg-hover hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent',
        )}
      >
        <Icon className="h-4 w-4 transition-transform duration-200" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-menu-button"
          className={cn(
            'absolute mt-2 w-36 rounded-lg border border-line bg-surface p-1 shadow-lg z-50 transition-all focus:outline-none text-xs font-medium text-fg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <button
            type="button"
            role="menuitem"
            data-testid="theme-option-light"
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 transition-colors hover:bg-hover hover:text-fg',
              theme === 'light' ? 'bg-selected text-accent font-semibold' : 'text-fg',
            )}
          >
            <span className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5" />
              <span>Sáng</span>
            </span>
            {theme === 'light' && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>

          <button
            type="button"
            role="menuitem"
            data-testid="theme-option-dark"
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 transition-colors hover:bg-hover hover:text-fg',
              theme === 'dark' ? 'bg-selected text-accent font-semibold' : 'text-fg',
            )}
          >
            <span className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5" />
              <span>Tối</span>
            </span>
            {theme === 'dark' && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>

          <button
            type="button"
            role="menuitem"
            data-testid="theme-option-system"
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 transition-colors hover:bg-hover hover:text-fg',
              theme === 'system' ? 'bg-selected text-accent font-semibold' : 'text-fg',
            )}
          >
            <span className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5" />
              <span>Hệ thống</span>
            </span>
            {theme === 'system' && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>
        </div>
      )}
    </div>
  );
}
