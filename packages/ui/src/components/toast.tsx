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
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div
      role="status"
      className={`fixed right-6 top-6 z-50 rounded-md border px-4 py-3 text-sm shadow-lg ${styles}`}
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
  const closeToast = React.useCallback(
    () => setToast((curr) => ({ ...curr, message: null })),
    [],
  );
  return {
    message: toast.message,
    variant: toast.variant,
    showToast,
    closeToast,
  };
}
