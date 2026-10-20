'use client';

import * as React from 'react';

export interface ToastProps {
  message: React.ReactNode | null;
  onClose: () => void;
  variant?: 'error' | 'success';
}

export function Toast({ message, onClose, variant = 'error' }: ToastProps) {
  React.useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const styles =
    variant === 'success'
      ? 'border border-ok/30 bg-ok-bg text-ok'
      : 'border border-crit/30 bg-crit-bg text-crit';

  return (
    <div
      role="status"
      className={`fixed right-6 top-6 z-50 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-md transition-all ${styles}`}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState<{
    message: React.ReactNode | null;
    variant: 'error' | 'success';
  }>({
    message: null,
    variant: 'error',
  });
  const showToast = React.useCallback(
    (nextMessage: React.ReactNode | null, variant: 'error' | 'success' = 'error') => {
      setToast({ message: nextMessage, variant });
    },
    [],
  );
  const closeToast = React.useCallback(() => setToast((curr) => ({ ...curr, message: null })), []);
  return {
    message: toast.message,
    variant: toast.variant,
    showToast,
    closeToast,
  };
}
