'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, X } from 'lucide-react';
import type { Idea, PromoteIdeaResponse } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { promoteIdeaToProject } from '@/lib/api';
import { cn } from '@/lib/utils';

type PromoteModalProps = {
  idea: Idea;
  open: boolean;
  onClose: () => void;
  /** Called after a successful promote, with the updated idea + new project. */
  onPromoted?: (res: PromoteIdeaResponse) => void;
};

/**
 * Promote an idea to a project. Just a project name (prefilled from the idea
 * title) — no repo picker: a project can span multiple repos, so the repo is
 * chosen per-request elsewhere. On success, routes to the new project's modal.
 */
export function PromoteModal({ idea, open, onClose, onPromoted }: PromoteModalProps) {
  const router = useRouter();
  const [name, setName] = useState(idea.title);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the project a name');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await promoteIdeaToProject(idea.id, { name: trimmed });
      onPromoted?.(res);
      router.push(`/projects?open=${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote idea');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Promote idea to project"
          className="pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Rocket className="h-4 w-4" />
              Promote to project
            </h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex flex-col gap-3 px-5 py-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Project name</span>
              <input
                aria-label="Project name"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submit();
                  }
                }}
                autoFocus
              />
            </label>
            <p className="text-xs text-muted-foreground">
              The idea stays here as a living document, linked to the new project. You can wire
              repos to its tasks afterwards.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <footer className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void submit()}
              disabled={submitting}
              className={cn(submitting && 'opacity-50')}
            >
              {submitting ? 'Promoting…' : 'Create project'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
