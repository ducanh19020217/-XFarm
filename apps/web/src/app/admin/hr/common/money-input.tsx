'use client';

import * as React from 'react';
import { cn } from '@xfarm/ui';

export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value?: number | string;
  onChange?: (val: number) => void;
  currencySuffix?: string;
  error?: boolean;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      currencySuffix = '₫',
      className,
      disabled,
      placeholder = '0',
      error,
      ...props
    },
    ref,
  ) => {
    // Format numeric value to string with thousand separators (e.g., 300000 -> 300.000)
    const formatDisplay = (val: number | string | undefined): string => {
      if (val === undefined || val === null || val === '') return '';
      const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
      if (Number.isNaN(num)) return '';
      return num.toLocaleString('vi-VN');
    };

    const [displayVal, setDisplayVal] = React.useState<string>(() => formatDisplay(value));

    React.useEffect(() => {
      setDisplayVal(formatDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw === '') {
        setDisplayVal('');
        onChange?.(0);
        return;
      }
      const num = parseInt(raw, 10);
      setDisplayVal(num.toLocaleString('vi-VN'));
      onChange?.(num);
    };

    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-right',
            error && 'border-red-500 focus-visible:ring-red-500',
            className,
          )}
          {...props}
        />
        <span className="pointer-events-none absolute right-3 text-sm text-slate-500 dark:text-slate-400">
          {currencySuffix}
        </span>
      </div>
    );
  },
);

MoneyInput.displayName = 'MoneyInput';
