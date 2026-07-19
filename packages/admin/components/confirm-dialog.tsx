'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@midnite/ui';

/**
 * A minimal, admin-local confirmation modal (Phase 73 Theme F) for destructive
 * actions (delete team, remove member). `@midnite/ui` exports no dialog primitive,
 * so this is a small self-contained overlay: a portal to `document.body`, an
 * Escape-to-cancel handler, and a backdrop click that cancels. Kept generic.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
