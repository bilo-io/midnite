'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronDown, FileText, Loader2, Plus, X } from 'lucide-react';
import type { Project, ProjectDoc } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectTag } from '@/components/project-tag';
import { PlanDocModal } from '@/components/plan-doc-modal';
import { useConfirm } from '@/components/confirm-dialog';
import { TEMPLATES, type Template } from '@/app/(main)/projects/templates';
import { createProjectDoc, deleteProjectDoc, generateProjectDoc, getProjectDocs, updateProjectDoc } from '@/lib/api';
import { useProjectTemplateLabels } from '@/lib/project-template-labels';
import { cn } from '@/lib/utils';

type Props = {
  project: Project;
  templates?: Template[];
  /** Notify a host (the modal) when the nested doc editor opens/closes, so it can
   *  yield Escape to it. The detail page doesn't need this. */
  onDocOpenChange?: (open: boolean) => void;
};

/**
 * The project's planning documents (Phase 55 B, moved off browser localStorage
 * onto the gateway) — extracted from the modal so the modal + detail page render
 * the same list + template picker + doc editor.
 */
export function ProjectPlanPanel({ project, templates = TEMPLATES, onDocOpenChange }: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const templateLabels = useProjectTemplateLabels();
  const confirm = useConfirm();
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
  const [addRect, setAddRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getProjectDocs(project.id);
        if (!cancelled) setDocs(items);
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [project.id, errMsg]);

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
      const target = e.target as Node;
      if (addRef.current?.contains(target) || addMenuRef.current?.contains(target)) return;
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

  const addDoc = useCallback(
    async (template: Template) => {
      setAddOpen(false);
      setAddingTemplateId(template.id);
      setError(null);
      try {
        const doc = await createProjectDoc(project.id, { templateId: template.id });
        setDocs((prev) => [...prev, doc]);
        setOpenDocId(doc.id);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setAddingTemplateId(null);
      }
    },
    [project.id, errMsg],
  );

  const removeDoc = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: t('plan.removeConfirmTitle'),
        description: t('plan.removeConfirmDescription'),
        confirmLabel: tCommon('remove'),
      });
      if (!ok) return;
      setError(null);
      try {
        await deleteProjectDoc(project.id, id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
        setOpenDocId((cur) => (cur === id ? null : cur));
      } catch (e) {
        setError(errMsg(e));
      }
    },
    [confirm, project.id, errMsg, t, tCommon],
  );

  const saveDoc = useCallback(
    async (id: string, patch: { name?: string; content?: string }) => {
      const updated = await updateProjectDoc(project.id, id, patch);
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    },
    [project.id],
  );

  const generateDoc = useCallback(
    async (id: string) => {
      const updated = await generateProjectDoc(project.id, id);
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    [project.id],
  );

  const availableTemplates = templates.filter((tpl) => !docs.some((d) => d.templateId === tpl.id));
  const openDoc = docs.find((d) => d.id === openDocId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{t('plan.documents')}</label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {t('plan.docCount', { count: docs.length })}
        </span>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {t('plan.loading')}
        </p>
      ) : docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {t('plan.empty')}
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
                aria-label={t('plan.removeDoc')}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div>
        <Button
          ref={addRef}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAddOpen((v) => !v)}
          disabled={availableTemplates.length === 0 || addingTemplateId !== null}
          aria-haspopup="listbox"
          aria-expanded={addOpen}
          className="gap-1.5"
        >
          {addingTemplateId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('plan.addDocument')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', addOpen && 'rotate-180')} />
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {availableTemplates.length === 0 ? t('plan.allTemplatesUsed') : t('plan.addHint')}
        </p>
      </div>

      {addOpen && addRect
        ? createPortal(
            <div
              ref={addMenuRef}
              role="listbox"
              aria-label={t('plan.templatesListAria')}
              style={{ position: 'fixed', top: addRect.top, left: addRect.left, minWidth: Math.max(addRect.width, 224) }}
              className="z-[60] max-h-72 w-64 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {availableTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void addDoc(tpl)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  <ProjectTag tag={tpl.tag} color={tpl.color} />
                  <span className="min-w-0 flex-1 truncate">{templateLabels.name(tpl)}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {openDoc ? (
        <PlanDocModal
          doc={openDoc}
          onSave={(patch) => saveDoc(openDoc.id, patch)}
          onDelete={() => void removeDoc(openDoc.id)}
          onClose={() => setOpenDocId(null)}
          onGenerate={() => generateDoc(openDoc.id)}
        />
      ) : null}
    </div>
  );
}
