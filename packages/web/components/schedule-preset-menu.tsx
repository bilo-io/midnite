'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { WorkflowTemplateSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { installWorkflowTemplate } from '@/lib/api';
import { cn } from '@/lib/utils';

// Phase 45 D — "New from preset": one-click install of a task-creating schedule
// starter (the Daily standup system template). Hidden when no presets exist.
export function SchedulePresetMenu({
  presets,
  onInstalled,
}: {
  presets: WorkflowTemplateSummary[];
  onInstalled: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (presets.length === 0) return null;

  const install = async (t: WorkflowTemplateSummary) => {
    setInstallingId(t.id);
    try {
      await installWorkflowTemplate(t.id, { credentialMap: {} });
      toast.success(`Added “${t.name}” — enable it to start firing.`);
      setOpen(false);
      onInstalled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add preset');
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Sparkles className="h-4 w-4" />
        New from preset
      </Button>
      {open ? (
        <div
          role="menu"
          aria-label="Schedule presets"
          className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-md border border-border bg-card shadow-xl"
        >
          {presets.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => void install(t)}
              disabled={installingId !== null}
              className={cn(
                'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 disabled:opacity-50',
              )}
            >
              {installingId === t.id ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-medium">{t.name}</span>
                {t.description ? (
                  <span className="block text-[10px] text-muted-foreground">{t.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
