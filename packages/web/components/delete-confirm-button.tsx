'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';

type Props = {
  onConfirm: () => void;
  label?: string;
  /** What's being deleted, e.g. "session" — used in the dialog copy. */
  noun?: string;
};

// A destructive button that opens a confirmation dialog before firing, so a
// permanent delete always takes a deliberate, acknowledged second action.
export function DeleteConfirmButton({ onConfirm, label, noun }: Props) {
  const t = useTranslations('common');
  const confirm = useConfirm();
  const resolvedLabel = label ?? t('delete');

  const run = async () => {
    const ok = await confirm({
      title: t('deleteNounTitle', { noun: noun ?? t('item') }),
      description: t('deletePermanent'),
      confirmLabel: resolvedLabel,
    });
    if (ok) onConfirm();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void run()}
      className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" /> {resolvedLabel}
    </Button>
  );
}
