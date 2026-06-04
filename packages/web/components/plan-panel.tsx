'use client';

import { useMemo, useState } from 'react';
import { ListChecks, Loader2, Save, Sparkles, X } from 'lucide-react';
import {
  applyChecklistState,
  parsePlanChecklist,
  type ChecklistSection,
  type Project,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectTag } from '@/components/project-tag';
import { createTasksFromPlan, draftProjectPlan, updateProjectPlan } from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  project: Project;
  onClose: () => void;
  /** Refresh the board/list after the plan or tasks change. */
  onChanged: () => void;
};

export function PlanPanel({ project, onClose, onChanged }: Props) {
  const [markdown, setMarkdown] = useState(project.plan ?? '');
  const [sections, setSections] = useState<ChecklistSection[]>(() =>
    project.plan ? parsePlanChecklist(project.plan) : [],
  );
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const checkedCount = allItems.filter((i) => i.checked).length;

  const toggle = (id: string) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
      })),
    );
  };

  const draft = async () => {
    setDrafting(true);
    setError(null);
    setNotice(null);
    try {
      const { plan } = await draftProjectPlan(project.id);
      setMarkdown(plan);
      setSections(parsePlanChecklist(plan));
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDrafting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = applyChecklistState(markdown, allItems);
      await updateProjectPlan(project.id, updated);
      setMarkdown(updated);
      setNotice('Saved.');
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const createTasks = async () => {
    const titles = allItems.filter((i) => i.checked).map((i) => i.text);
    if (titles.length === 0) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await createTasksFromPlan(project.id, titles);
      const updated = applyChecklistState(markdown, allItems);
      await updateProjectPlan(project.id, updated);
      setMarkdown(updated);
      setNotice(`Created ${titles.length} task${titles.length === 1 ? '' : 's'} on the board.`);
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const hasPlan = sections.length > 0 || markdown.trim().length > 0;

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
          aria-label={`Plan for ${project.name}`}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <ProjectTag tag={project.tag} color={project.color} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{project.name} — plan</h2>
              <p className="text-xs text-muted-foreground">
                Drafted from the description and {project.sources.length} source
                {project.sources.length === 1 ? '' : 's'}.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!hasPlan ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No plan yet. Draft a comprehensive checklist from this project&apos;s
                  description and sources.
                </p>
                <Button type="button" onClick={() => void draft()} disabled={drafting}>
                  {drafting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Draft plan
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {sections.map((section, si) => (
                  <section key={si} className="space-y-2">
                    {section.heading ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.heading}
                      </h3>
                    ) : null}
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggle(item.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-foreground"
                            />
                            <span className="text-sm leading-snug">{item.text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    The plan has no checkbox items to show.
                  </p>
                ) : null}
              </div>
            )}

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="mt-4 text-sm text-muted-foreground">{notice}</p> : null}
          </div>

          {hasPlan ? (
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void draft()}
                disabled={drafting}
              >
                {drafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Regenerate
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void createTasks()}
                  disabled={creating || checkedCount === 0}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ListChecks className="h-4 w-4" />
                  )}
                  Create {checkedCount > 0 ? checkedCount : ''} task{checkedCount === 1 ? '' : 's'}
                </Button>
              </div>
            </footer>
          ) : null}
        </div>
      </div>
    </>
  );
}
