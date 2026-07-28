'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Visual status of the confirmation. Picks the glyph and the confirm button's
 * colour — a `danger` prompt reads as "you're about to break something", while
 * `success` reads as "you're about to complete something" (e.g. marking a task
 * done, which is a normal, non-destructive outcome).
 */
export type ConfirmTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

type ToneStyle = {
  icon: LucideIcon | null;
  /** Classes for the glyph bubble. */
  badge: string;
  /** Extra classes for the confirm button (empty = use `buttonVariant`). */
  confirmClass: string;
  buttonVariant: 'default' | 'destructive';
};

const TONES: Record<ConfirmTone, ToneStyle> = {
  danger: {
    icon: AlertTriangle,
    badge: 'bg-destructive/10 text-destructive',
    confirmClass: '',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'bg-amber-500/10 text-amber-500',
    confirmClass: 'bg-amber-500 text-background hover:bg-amber-500/90',
    buttonVariant: 'default',
  },
  success: {
    icon: CheckCircle2,
    badge: 'bg-success/10 text-success',
    confirmClass: 'bg-success text-success-foreground hover:bg-success/90',
    buttonVariant: 'default',
  },
  info: {
    icon: Info,
    badge: 'bg-primary/10 text-primary',
    confirmClass: '',
    buttonVariant: 'default',
  },
  neutral: { icon: null, badge: '', confirmClass: '', buttonVariant: 'default' },
};

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual status — glyph + confirm-button colour. Default `danger`. */
  tone?: ConfirmTone;
  /**
   * Optional action to run on confirm. When given, the dialog stays up in a busy
   * state until it settles: on success it closes and `confirm()` resolves `true`;
   * on rejection it stays open and shows the error so the user can retry or cancel.
   * Omit it to keep the plain `const ok = await confirm({...})` flow.
   */
  onConfirm?: () => void | Promise<void>;
};

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

/**
 * Returns a `confirm(opts)` that resolves to true/false once the user picks:
 * `if (!(await confirm({ title }))) return;`
 *
 * `opts` carries the copy (`title` / `description` / labels), the visual `tone`
 * (default `danger`), and optionally the `onConfirm` action itself — pass that to
 * let the dialog own the busy + error state instead of doing it at the call site.
 */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirm = React.useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  const close = React.useCallback((ok: boolean) => {
    setState((s) => {
      s?.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? <ConfirmDialog state={state} onClose={close} /> : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: (ok: boolean) => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tc = useTranslations('common');

  const tone: ConfirmTone = state.tone ?? 'danger';
  const style = TONES[tone];
  const Icon = style.icon;

  // With an `onConfirm` action the dialog owns the async work: it blocks further
  // input while it runs and only closes once the action resolves.
  const { onConfirm } = state;
  const runConfirm = React.useCallback(async () => {
    if (!onConfirm) {
      onClose(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [onConfirm, onClose]);

  // The key handler is bound once (re-binding would re-run the focus save/restore
  // below), so it reads the live confirm action + busy flag through a ref.
  const latest = React.useRef({ runConfirm, busy });
  latest.current = { runConfirm, busy };

  React.useEffect(() => {
    // Remember what had focus so we can restore it when the dialog closes
    // (Phase 60 I — return focus to the trigger, not <body>).
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    // Capture phase + stopImmediatePropagation so the dialog owns Escape/Enter
    // and the underlying modal's own Escape handler doesn't also fire (which
    // would close it out from under the confirmation). Tab is trapped inside the
    // dialog so focus can't wander to the (inert) content behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!latest.current.busy) onClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!latest.current.busy) void latest.current.runConfirm();
      } else if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const activeEl = document.activeElement;
        if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
        onClick={() => {
          if (!busy) onClose(false);
        }}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={state.title}
        className="animate-dialog-in relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                style.badge,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-snug">{state.title}</h2>
            {state.description ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{state.description}</p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onClose(false)}
          >
            {state.cancelLabel ?? tc('cancel')}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={style.buttonVariant}
            size="sm"
            className={style.confirmClass || undefined}
            disabled={busy}
            onClick={() => void runConfirm()}
          >
            {state.confirmLabel ?? (tone === 'danger' ? tc('delete') : tc('confirm'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
