'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, MousePointerClick, Sparkles, Webhook, X, type LucideIcon } from 'lucide-react';
import type { Trigger, TriggerType } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { createWorkflow, updateWorkflow } from '@/lib/api';
import { buildTemplateGraph, triggerNodeOf, WORKFLOW_TEMPLATES } from '@/lib/workflow-templates';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const TRIGGERS: Array<{ type: TriggerType; label: string; Icon: LucideIcon; hint: string }> = [
  { type: 'manual', label: 'Manual', Icon: MousePointerClick, hint: 'Run on demand' },
  { type: 'schedule', label: 'Schedule', Icon: Clock, hint: 'Run on a cron' },
  { type: 'webhook', label: 'Webhook', Icon: Webhook, hint: 'Run on a request' },
];

const TRIGGER_LABEL: Record<TriggerType, string> = {
  manual: 'Manual',
  schedule: 'Schedule',
  webhook: 'Webhook',
};

function triggerFor(type: TriggerType): Trigger {
  if (type === 'schedule') return { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' };
  if (type === 'webhook') return { type: 'webhook', method: 'POST', hasSecret: false };
  return { type: 'manual' };
}

export function WorkflowCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('manual');
  // null = "Blank" (the trigger picker drives it); otherwise a template id seeds the graph.
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templateId ? WORKFLOW_TEMPLATES.find((t) => t.id === templateId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Picking a template prefills the name (only if the user hasn't typed one) so a
  // one-click create is possible; the trigger then comes from the template.
  const pickTemplate = (id: string | null) => {
    setTemplateId(id);
    if (id) {
      const t = WORKFLOW_TEMPLATES.find((tpl) => tpl.id === id);
      if (t && !name.trim()) setName(t.name);
    }
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const trigger = template ? template.trigger : triggerFor(triggerType);
      const workflow = await createWorkflow({ name: name.trim(), trigger });
      // A template seeds the freshly-created workflow's graph before we open it.
      if (template) {
        const graph = buildTemplateGraph(template, triggerNodeOf(workflow, template));
        await updateWorkflow(workflow.id, { nodes: graph.nodes, edges: graph.edges });
      }
      router.push(`/workflows/edit?id=${workflow.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create workflow');
      setSaving(false);
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
          aria-label="New workflow"
          className="pointer-events-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">New workflow</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Start from</span>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => pickTemplate(null)}
                  aria-pressed={templateId === null}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    templateId === null
                      ? 'border-foreground/30 bg-accent'
                      : 'border-border/60 hover:bg-accent/40',
                  )}
                >
                  <span className="block text-xs font-medium">Blank workflow</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Start from an empty canvas with just a trigger.
                  </span>
                </button>

                {WORKFLOW_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTemplate(t.id)}
                    aria-pressed={templateId === t.id}
                    className={cn(
                      'flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors',
                      templateId === t.id
                        ? 'border-foreground/30 bg-accent'
                        : 'border-border/60 hover:bg-accent/40',
                    )}
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{t.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{t.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="workflow-name" className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                id="workflow-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
                placeholder="e.g. Daily standup summary"
                autoFocus
              />
            </div>

            {template ? (
              <p className="text-xs text-muted-foreground">
                Trigger: <span className="font-medium text-foreground">{TRIGGER_LABEL[template.trigger.type]}</span>{' '}
                — set by the template, editable after creating.
              </p>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Trigger</span>
                <div className="grid grid-cols-3 gap-2">
                  {TRIGGERS.map(({ type, label, Icon, hint }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTriggerType(type)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-md border p-3 text-center transition-colors',
                        triggerType === type
                          ? 'border-foreground/30 bg-accent'
                          : 'border-border/60 hover:bg-accent/40',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {template ? 'Create from template' : 'Create workflow'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
