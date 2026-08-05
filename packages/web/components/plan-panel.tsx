'use client';

import { useMemo, useState } from 'react';
import { GitBranch, ListChecks, Loader2, Save, Sparkles, X } from 'lucide-react';
import {
  applyChecklistState,
  parsePlanChecklist,
  type Breakdown,
  type ChecklistSection,
  type Project,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { ProjectTag } from '@/components/project-tag';
import { BreakdownEditor } from '@/components/breakdown-editor';
import { PlanOverviewStep } from '@/components/plan-overview-step';
import {
  createTasksFromBreakdown,
  createTasksFromPlan,
  draftProjectBreakdown,
  draftProjectPlan,
  updateProjectPlan,
} from '@/lib/api';

type PlanMode = 'checklist' | 'breakdown';

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

type Props = {
  project: Project;
  onClose: () => void;
  /** Refresh the board/list after the plan or tasks change. */
  onChanged: () => void;
};

export function PlanPanel({ project, onClose, onChanged }: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [markdown, setMarkdown] = useState(project.plan ?? '');
  const [sections, setSections] = useState<ChecklistSection[]>(() =>
    project.plan ? parsePlanChecklist(project.plan) : [],
  );
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<PlanMode>('checklist');
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [breakdownFallback, setBreakdownFallback] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  // Draft-plan Stage 1: the approved execution-plan overview text, or null while
  // still on the doc-selection/drafting step. Woven into the breakdown's context.
  const [overviewApproved, setOverviewApproved] = useState<string | null>(null);

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
      setError(errMsg(e, t('plan.genericError')));
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
      setNotice(t('plan.savedNotice'));
      onChanged();
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
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
      setNotice(t('plan.createdOnBoard', { count: titles.length }));
      onChanged();
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
    } finally {
      setCreating(false);
    }
  };

  const generateBreakdown = async () => {
    setBreakingDown(true);
    setError(null);
    setNotice(null);
    try {
      const res = await draftProjectBreakdown(project.id, overviewApproved ?? undefined);
      setBreakdown(res.breakdown);
      setBreakdownFallback(res.isFallback);
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
    } finally {
      setBreakingDown(false);
    }
  };

  const createBoard = async () => {
    if (!breakdown || breakdown.tasks.length === 0) return;
    setCreatingBoard(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createTasksFromBreakdown(project.id, breakdown);
      setNotice(t('plan.createdSequenced', { count: created.length }));
      setBreakdown(null);
      onChanged();
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
    } finally {
      setCreatingBoard(false);
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
          aria-label={t('plan.dialogLabel', { name: project.name })}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <ProjectTag tag={project.tag} color={project.color} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">
                {t('plan.heading', { name: project.name })}
              </h2>
              <p className="text-xs text-muted-foreground">{t('plan.subheading')}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tCommon('close')}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-2.5">
            <Tabs<PlanMode>
              ariaLabel={t('plan.viewAria')}
              value={mode}
              onChange={setMode}
              options={[
                {
                  value: 'checklist',
                  label: t('plan.checklist'),
                  icon: <ListChecks className="h-3.5 w-3.5" />,
                },
                {
                  value: 'breakdown',
                  label: t('plan.breakdown'),
                  icon: <GitBranch className="h-3.5 w-3.5" />,
                },
              ]}
            />
            <span className="text-xs text-muted-foreground">
              {mode === 'checklist' ? t('plan.checklistHint') : t('plan.breakdownHint')}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {mode === 'breakdown' ? (
              breakdown ? (
                <div className="space-y-4">
                  {breakdownFallback ? (
                    <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      {t('plan.fallbackWarning')}
                    </p>
                  ) : null}
                  <BreakdownEditor breakdown={breakdown} onChange={setBreakdown} />
                </div>
              ) : overviewApproved !== null ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">{t('plan.breakdownPrompt')}</p>
                  <Button
                    type="button"
                    onClick={() => void generateBreakdown()}
                    disabled={breakingDown}
                  >
                    {breakingDown ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                    {t('plan.generateBreakdown')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverviewApproved(null)}
                  >
                    {t('plan.redoOverview')}
                  </Button>
                </div>
              ) : (
                <PlanOverviewStep
                  projectId={project.id}
                  onApprove={(overview) => setOverviewApproved(overview)}
                />
              )
            ) : !hasPlan ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-10 text-center">
                <p className="text-sm text-muted-foreground">{t('plan.noPlan')}</p>
                <Button type="button" onClick={() => void draft()} disabled={drafting}>
                  {drafting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t('plan.draftPlan')}
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
                  <p className="text-sm text-muted-foreground">{t('plan.noItems')}</p>
                ) : null}
              </div>
            )}

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="mt-4 text-sm text-muted-foreground">{notice}</p> : null}
          </div>

          {mode === 'breakdown' && breakdown ? (
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void generateBreakdown()}
                disabled={breakingDown}
              >
                {breakingDown ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
                {t('plan.regenerate')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void createBoard()}
                disabled={creatingBoard || breakdown.tasks.length === 0}
              >
                {creatingBoard ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="h-4 w-4" />
                )}
                {t('plan.createTasks', { count: breakdown.tasks.length })}
              </Button>
            </footer>
          ) : mode === 'checklist' && hasPlan ? (
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
                {t('plan.regenerate')}
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
                  {tCommon('save')}
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
                  {t('plan.createTasks', { count: checkedCount })}
                </Button>
              </div>
            </footer>
          ) : null}
        </div>
      </div>
    </>
  );
}
