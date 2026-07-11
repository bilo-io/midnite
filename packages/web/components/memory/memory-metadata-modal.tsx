'use client';

import { BrainCircuit, X } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MemoryDocPanel } from './memory-doc-panel';

/**
 * Edit a memory's metadata (title, scope, content) and delete it, in a modal
 * opened from the workspace header's ellipsis button. Wraps the shared
 * `MemoryDocPanel` in the app's standard modal chrome; a successful save or a
 * delete closes the modal.
 */
export function MemoryMetadataModal({
  memory,
  projects,
  onSaved,
  onDeleted,
  onClose,
}: {
  memory: Memory;
  projects: Project[];
  onSaved: (memory: Memory) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
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
          aria-label="Edit memory"
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <BrainCircuit className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
            <h2 className="flex-1 text-sm font-semibold">Edit memory</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <MemoryDocPanel
              memory={memory}
              projects={projects}
              onSaved={(m) => {
                onSaved(m);
                onClose();
              }}
              onDeleted={() => {
                onClose();
                onDeleted();
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
