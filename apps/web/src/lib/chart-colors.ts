'use client';

import * as React from 'react';

export interface ChartColors {
  grid: string;
  axis: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  accent: string;
}

const DEFAULT_LIGHT_COLORS: ChartColors = {
  grid: 'hsla(229, 15%, 6%, 12%)',
  axis: '#6c7393',
  text: '#21232c',
  muted: '#6c7393',
  border: 'hsla(229, 15%, 6%, 12%)',
  surface: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipBorder: 'hsla(229, 15%, 6%, 12%)',
  tooltipText: '#21232c',
  accent: '#15803d',
};

const DEFAULT_DARK_COLORS: ChartColors = {
  grid: '#2a2d39',
  axis: '#8a8fa8',
  text: '#dcdfe8',
  muted: '#8a8fa8',
  border: '#2a2d39',
  surface: '#1e2029',
  tooltipBg: '#1e2029',
  tooltipBorder: '#2a2d39',
  tooltipText: '#dcdfe8',
  accent: '#4ade80',
};

/**
 * Returns dynamic color values for Recharts (grid, axis, text, tooltip)
 * by reading current CSS custom property tokens or checking dark mode class.
 */
export function chartColors(): ChartColors {
  if (typeof window === 'undefined') {
    return DEFAULT_LIGHT_COLORS;
  }

  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const defaults = isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
  const style = getComputedStyle(root);

  const getVar = (name: string, fallback: string) => {
    const val = style.getPropertyValue(name).trim();
    return val || fallback;
  };

  const border = getVar('--t-border', defaults.border);
  const surface = getVar('--t-surface', defaults.surface);
  const text = getVar('--t-text', defaults.text);
  const muted = getVar('--t-text-3', defaults.muted);
  const accent = getVar('--t-accent', defaults.accent);

  return {
    grid: border,
    axis: muted,
    text,
    muted,
    border,
    surface,
    tooltipBg: surface,
    tooltipBorder: border,
    tooltipText: text,
    accent,
  };
}

/**
 * React hook that returns reactive chart colors when theme toggles.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = React.useState<ChartColors>(chartColors);

  React.useEffect(() => {
    setColors(chartColors());

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setColors(chartColors());
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
