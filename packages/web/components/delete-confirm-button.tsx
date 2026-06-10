'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onConfirm: () => void;
  label?: string;
};

// A destructive button that flips to an inline "Confirm / Cancel" pair before
// firing, so a permanent delete always takes a deliberate second click.
export function DeleteConfirmButton({ onConfirm, label = 'Delete' }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete permanently?</span>
        <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
          Confirm
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
