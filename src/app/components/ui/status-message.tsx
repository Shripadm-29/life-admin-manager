import { ReactNode } from 'react';

interface StatusMessageProps {
  variant?: 'loading' | 'empty' | 'filtered' | 'error';
  message?: string;
  icon?: ReactNode;
}

export function StatusMessage({ variant = 'loading', message, icon }: StatusMessageProps) {
  const defaultText =
    variant === 'loading'
      ? 'Loading...'
      : variant === 'filtered'
      ? 'No results found.'
      : variant === 'error'
      ? 'Something went wrong.'
      : 'No items yet.';

  const wrapperClass =
    variant === 'error' ? 'p-8 text-center text-red-600' : 'p-8 text-center text-gray-500';

  return (
    <div className={wrapperClass} role={variant === 'error' ? 'alert' : 'status'}>
      <div aria-live="polite" className="sr-only">{defaultText}</div>
      {icon && <div className="mx-auto mb-3">{icon}</div>}
      <p>{message || defaultText}</p>
    </div>
  );
}
