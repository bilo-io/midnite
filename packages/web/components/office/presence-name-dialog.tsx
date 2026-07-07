'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Phase 64 Theme B — the first-visit "what should teammates call you?" prompt for
 * the no-auth local mode. Controlled: the office owns visibility + persistence
 * ([`presence-identity.ts`](../../lib/presence-identity.ts)) and re-sends the
 * presence hello after a name is chosen. A short, escapable dialog seeded with the
 * generated default; "Use default" skips without renaming.
 */
export function PresenceNameDialog({
  open,
  defaultName,
  onSubmit,
  onSkip,
}: {
  open: boolean;
  defaultName: string;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(defaultName);

  // Re-seed the field whenever the dialog (re)opens with a new default.
  useEffect(() => {
    if (open) setValue(defaultName);
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onSkip]);

  if (!open) return null;

  const submit = () => {
    const name = value.trim();
    onSubmit(name.length > 0 ? name : defaultName);
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onSkip} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose your office name"
        className="animate-dialog-in relative w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Join the office</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          What should teammates call you? This shows above your avatar.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            value={value}
            maxLength={40}
            aria-label="Display name"
            placeholder={defaultName}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              Use default
            </Button>
            <Button type="submit" size="sm">
              Join
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
