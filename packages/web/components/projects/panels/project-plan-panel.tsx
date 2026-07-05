'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, FileText, Plus, X } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectTag } from '@/components/project-tag';
import { PlanDocModal } from '@/components/plan-doc-modal';
import { useConfirm } from '@/components/confirm-dialog';
import { TEMPLATES, type Template } from '@/app/(main)/projects/templates';
import { createDocFromTemplate, loadPlanDocs, savePlanDocs, type PlanDoc } from '@/app/(main)/projects/planning';
import { cn } from '@/lib/utils';

type Props = {
  project: Project;
  templates?: Template[];
  /** Notify a host (the modal) when the nested doc editor opens/closes, so it can
   *  yield Escape to it. The detail page doesn't need this. */
  onDocOpenChange?: (open: boolean) => void;
};

/**
 * The project's planning documents (Phase 55 B) — client-side, keyed by project
 * id. Extracted from the modal so the modal + detail page render the same list +
 * template picker + doc editor.
 */
export function ProjectPlanPanel({ project, templates = TEMPLATES, onDocOpenChange }: Props) {
  const confirm = useConfirm();
  const [docs, setDocs] = useState<PlanDoc[]>([]);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRect, setAddRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDocs(loadPlanDocs(project.id)), [project.id]);

  // Let a host modal know when the nested doc editor owns Escape.
  useEffect(() => onDocOpenChange?.(openDocId !== null), [openDocId, onDocOpenChange]);

  const placeAddMenu = useCallback(() => {
    const el = addRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAddRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    placeAddMenu();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (addRef.current?.contains(t) || addMenuRef.current?.contains(t)) return;
      setAddOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAddOpen(false);
      }
    };
    window.addEventListener('scroll', placeAddMenu, true);
    window.addEventListener('resize', placeAddMenu);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('scroll', placeAddMenu, true);
      window.removeEventListener('resize', placeAddMenu);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [addOpen, placeAddMenu]);

  const persistDocs = useCallback(
    (next: PlanDoc[]) => {
      setDocs(next);
      savePlanDocs(project.id, next);
    },
    [project.id],
  );

  const addDoc = useCallback(
    (template: Template) => {
      const doc = createDocFromTemplate(template, project.name || 'this project');
      persistDocs([...docs, doc]);
      setAddOpen(false);
      setOpenDocId(doc.id);
    },
    [docs, persistDocs, project.name],
  );

  const removeDoc = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Remove this document?',
        description: 'It will be deleted from this project. The source template is unchanged.',
        confirmLabel: 'Remove',
      });
      if (!ok) return;
      persistDocs(docs.filter((d) => d.id !== id));
      setOpenDocId((cur) => (cur === id ? null : cur));
    },
    [confirm, docs, persistDocs],
  );

  const availableTemplates = templates.filter((t) => !docs.some((d) => d.templateId === t.id));
  const openDoc = docs.find((d) => d.id === openDocId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Documents</label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {docs.length} doc{docs.length === 1 ? '' : 's'}
        </span>
      </div>

      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No planning documents yet. Add one from the template library to draft a spec or plan for this project.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5">
              <ProjectTag tag={d.tag} color={d.color} />
              <button
                type="button"
                onClick={() => setOpenDocId(d.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
              </button>
              <button
                type="button"
                onClick={() => void removeDoc(d.id)}
                aria-label="Remove document"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button
          ref={addRef}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAddOpen((v) => !v)}
          disabled={availableTemplates.length === 0}
          aria-haspopup="listbox"
          aria-expanded={addOpen}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add document
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', addOpen && 'rotate-180')} />
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {availableTemplates.length === 0
            ? 'Every template already has a document in this project.'
            : 'Documents are copied from the template library and titled for this project.'}
        </p>
      </div>

      {addOpen && addRect
        ? createPortal(
            <div
              ref={addMenuRef}
              role="listbox"
              aria-label="Templates"
              style={{ position: 'fixed', top: addRect.top, left: addRect.left, minWidth: Math.max(addRect.width, 224) }}
              className="z-[60] max-h-72 w-64 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {availableTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => addDoc(t)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  <ProjectTag tag={t.tag} color={t.color} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {openDoc ? (
        <PlanDocModal
          doc={openDoc}
          onSave={(patch) => persistDocs(docs.map((d) => (d.id === openDoc.id ? { ...d, ...patch } : d)))}
          onDelete={() => void removeDoc(openDoc.id)}
          onClose={() => setOpenDocId(null)}
        />
      ) : null}
    </div>
  );
}
