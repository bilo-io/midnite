'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, NotebookPen, Presentation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTag } from '@/components/project-tag';
import { Select, type SelectOption } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { getMemories, getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import {
  boardroomDocs,
  boardroomProjects,
  type BoardroomDoc,
  type ProjectFilter,
} from '@/lib/office/documents';
import { DocumentModal } from './document-modal';

/**
 * The board room: filter by project and browse the plans/documents assigned to it
 * (each project's plan + its scoped memories). Clicking a document opens it in a
 * read-only markdown modal. Opened from the Phaser scene when the player walks up
 * to the documents whiteboard; closes back to the office.
 */
export function BoardroomPanel({ onClose }: { onClose: () => void }) {
  const { data, error, loading } = useApiData(() => Promise.all([getProjects(), getMemories()]));
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [openDoc, setOpenDoc] = useState<BoardroomDoc | null>(null);

  const [projects, memories] = data ?? [[], []];
  const options = useMemo<SelectOption<ProjectFilter>[]>(
    () => [
      { value: 'all', label: 'All projects' },
      ...boardroomProjects(projects).map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects],
  );
  const docs = useMemo(() => boardroomDocs(projects, memories, filter), [projects, memories, filter]);

  // Own Escape so it closes the panel (Phaser's keyboard is disabled while open).
  // The document modal stops-propagation on its own Escape, so this only fires
  // when no doc is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Board room"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <Presentation className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Board Room</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="border-b border-border/60 px-4 py-3">
          <Select
            options={options}
            value={filter}
            onChange={setFilter}
            aria-label="Filter documents by project"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Couldn’t load documents — {error}</p>
          ) : docs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No plans or documents for {filter === 'all' ? 'any project' : 'this project'} yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setOpenDoc(doc)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/50"
                  >
                    {doc.kind === 'plan' ? (
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{doc.title}</span>
                    <ProjectTag tag={doc.tag} color={doc.color} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {openDoc ? <DocumentModal doc={openDoc} onClose={() => setOpenDoc(null)} /> : null}
    </div>
  );
}
