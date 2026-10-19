'use client';

import * as React from 'react';
import { Input } from '@xfarm/ui';

export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value?: number | null;
  onChange?: (val: number) => void;
  suffix?: string;
}

export function MoneyInput({
  value,
  onChange,
  suffix = '₫',
  className = '',
  placeholder = '0',
  disabled,
  ...props
}: MoneyInputProps) {
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || Number.isNaN(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const [displayValue, setDisplayValue] = React.useState<string>(formatNumber(value));

  React.useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d]/g, '');
    if (!cleaned) {
      setDisplayValue('');
      onChange?.(0);
      return;
    }
    const num = parseInt(cleaned, 10);
    setDisplayValue(new Intl.NumberFormat('vi-VN').format(num));
    onChange?.(num);
  };

  return (
    <div className="relative flex items-center w-full">
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`pr-10 ${className}`}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

export default MoneyInput;
