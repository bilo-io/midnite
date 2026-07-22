'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  /** Dialog heading, e.g. "Edit workflow". */
  heading: string;
  name: string;
  description?: string;
  nameLabel?: string;
  descriptionLabel?: string;
  /** Hide the description field for resources that only rename. */
  withDescription?: boolean;
  onSave: (next: { name: string; description: string }) => void;
  onClose: () => void;
};

/**
 * The small "edit details" dialog behind the header's pen button (Phase 81
 * follow-up): detail pages show a STATIC title/description in the shared
 * `PageHeader` (no inline editing), and renames go through this modal — name +
 * description inputs with explicit Save/Cancel. Mirrors the house modal idiom
 * (backdrop + centred card, Escape/backdrop to dismiss).
 */
export function EditDetailsModal({
  heading,
  name: initialName,
  description: initialDescription = '',
  nameLabel = 'Title',
  descriptionLabel = 'Description',
  withDescription = true,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`Give it a ${nameLabel.toLowerCase()}.`);
      return;
    }
    onSave({ name: trimmed, description: description.trim() });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          className="pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{heading}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <form
            className="space-y-3 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{nameLabel}</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label={nameLabel}
                autoFocus
              />
            </label>
            {withDescription ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{descriptionLabel}</span>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label={descriptionLabel}
                  rows={3}
                />
              </label>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </form>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save}>
              Save
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
