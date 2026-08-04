'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, TriangleAlert, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'warning' | 'error';

export type ToastOptions = {
  /** Milliseconds before the toast auto-dismisses. Errors default to longer. */
  duration?: number;
  /**
   * Secondary line under the message — the notification body to the message's
   * title. Rendered muted + clamped so a long body can't grow the stack.
   */
  description?: React.ReactNode;
};

type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
};

type ToastApi = {
  success: (message: React.ReactNode, opts?: ToastOptions) => void;
  /** Amber styling — matches the notification center's `warn` severity. */
  warning: (message: React.ReactNode, opts?: ToastOptions) => void;
  error: (message: React.ReactNode, opts?: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

/**
 * Returns `{ success, warning, error }` for surfacing transient feedback in the
 * bottom-right stack: `const toast = useToast(); toast.error(message)`.
 */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 6000,
  // Warnings and errors stick around longer so they can be read before they vanish.
  warning: 9000,
  error: 9000,
};

/** Per-variant border accent + leading icon (mirrors the notification center). */
const VARIANT_META: Record<ToastVariant, { Icon: LucideIcon; border: string; icon: string }> = {
  success: { Icon: CheckCircle2, border: 'border-emerald-500/40', icon: 'text-emerald-500' },
  warning: { Icon: TriangleAlert, border: 'border-amber-500/40', icon: 'text-amber-500' },
  error: { Icon: XCircle, border: 'border-destructive/40', icon: 'text-destructive' },
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (variant: ToastVariant, message: React.ReactNode, opts?: ToastOptions) => {
      const id = `toast-${nextId++}`;
      const duration = opts?.duration ?? DEFAULT_DURATION[variant];
      setToasts((prev) => [
        ...prev,
        { id, variant, message, description: opts?.description, duration },
      ]);
    },
    [],
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (message, opts) => push('success', message, opts),
      warning: (message, opts) => push('warning', message, opts),
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
  const t = useTranslations('common');
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, onDismiss]);

  const { Icon, border, icon } = VARIANT_META[item.variant];

  return (
    <div
      role="status"
      className={cn(
        'animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card/95 p-3 text-foreground shadow-lg backdrop-blur-sm',
        border,
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} />
      <div className="min-w-0 flex-1 break-words text-sm leading-snug">
        <div>{item.message}</div>
        {item.description ? (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('chrome.dismiss')}
        className="-mr-1 -mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
