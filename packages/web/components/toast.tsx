'use client';

import * as React from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error';

export type ToastOptions = {
  /** Milliseconds before the toast auto-dismisses. Errors default to longer. */
  duration?: number;
};

type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: React.ReactNode;
  duration: number;
};

type ToastApi = {
  success: (message: React.ReactNode, opts?: ToastOptions) => void;
  error: (message: React.ReactNode, opts?: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

/**
 * Returns `{ success, error }` for surfacing transient feedback in the bottom-right
 * stack: `const toast = useToast(); toast.error(message)`.
 */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  // Errors stick around longer so they can be read before they vanish.
  error: 7000,
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback((variant: ToastVariant, message: React.ReactNode, opts?: ToastOptions) => {
    const id = `toast-${nextId++}`;
    const duration = opts?.duration ?? DEFAULT_DURATION[variant];
    setToasts((prev) => [...prev, { id, variant, message, duration }]);
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // aria-live keeps screen readers informed as toasts arrive.
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, onDismiss]);

  const Icon = item.variant === 'success' ? CheckCircle2 : XCircle;

  return (
    <div
      role="status"
      className={cn(
        'animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur-sm',
        item.variant === 'success'
          ? 'border-emerald-500/40 text-foreground'
          : 'border-destructive/40 text-foreground',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          item.variant === 'success' ? 'text-emerald-500' : 'text-destructive',
        )}
      />
      <div className="min-w-0 flex-1 break-words text-sm leading-snug">{item.message}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
