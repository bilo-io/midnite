'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  Calendar,
  CheckCircle,
  Database,
  ExternalLink,
  GitBranch,
  Loader2,
  Package,
  Search,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import type { WorkflowTemplateSummary, WorkflowTemplateCategory, TemplateSlotsResponse } from '@midnite/shared';
import { WORKFLOW_TEMPLATE_CATEGORIES } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import {
  getWorkflowTemplateSlots,
  installWorkflowTemplate,
  listWorkflowCredentials,
  listWorkflowTemplates,
} from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { cn } from '@/lib/utils';

const CATEGORY_META: Record<
  WorkflowTemplateCategory,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  monitoring: { label: 'Monitoring', Icon: Zap },
  notifications: { label: 'Notifications', Icon: Webhook },
  github: { label: 'GitHub', Icon: GitBranch },
  scheduling: { label: 'Scheduling', Icon: Calendar },
  ai: { label: 'AI', Icon: Bot },
  data: { label: 'Data', Icon: Database },
};

function CategoryIcon({
  category,
  className,
}: {
  category: WorkflowTemplateCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  if (!meta) return <Package className={className} />;
  const { Icon } = meta;
  return <Icon className={className} />;
}

function TemplateCard({
  template,
  onInstall,
}: {
  template: WorkflowTemplateSummary;
  onInstall: (t: WorkflowTemplateSummary) => void;
}) {
  const category = CATEGORY_META[template.category];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-foreground/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
          <CategoryIcon category={template.category} className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{template.name}</h3>
          {category ? (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {category.label}
            </span>
          ) : null}
        </div>
      </div>

      {template.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
      ) : null}

      {template.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {template.credentialSlots.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Requires: {template.credentialSlots.map((s) => s.key).join(', ')}
        </p>
      ) : null}

      <Button size="sm" className="mt-auto" onClick={() => onInstall(template)}>
        Use template
      </Button>
    </div>
  );
}

function InstallModal({
  template,
  onClose,
  onInstalled,
}: {
  template: WorkflowTemplateSummary;
  onClose: () => void;
  onInstalled: (workflowId: string) => void;
}) {
  const [slots, setSlots] = useState<TemplateSlotsResponse | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [credMap, setCredMap] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const { data: credentials } = useApiData(() => listWorkflowCredentials());
  const creds = credentials ?? [];

  useEffect(() => {
    getWorkflowTemplateSlots(template.id)
      .then(setSlots)
      .catch((e: unknown) =>
        setSlotsError(e instanceof Error ? e.message : 'Failed to load slots'),
      );
  }, [template.id]);

  const install = async () => {
    setInstallError(null);
    setInstalling(true);
    try {
      const workflow = await installWorkflowTemplate(template.id, { credentialMap: credMap });
      onInstalled(workflow.id);
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  };

  const slotsReady = !slots || slots.slots.every((s) => credMap[s.key] || s.satisfiedBy);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{template.name}</h2>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {slotsError ? (
          <p className="mb-3 text-xs text-destructive">{slotsError}</p>
        ) : !slots ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : slots.slots.length === 0 ? (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            <CheckCircle className="h-3.5 w-3.5" /> No credentials required
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <p className="text-xs font-medium">Connect credentials</p>
            {slots.slots.map((slot) => {
              const match = slot.satisfiedBy
                ? creds.find((c) => c.id === slot.satisfiedBy)
                : undefined;
              const candidates = creds.filter((c) => c.type === slot.type);
              return (
                <div key={slot.key} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{slot.key}</span>
                    <span className="rounded bg-muted/60 px-1 py-px text-[10px] text-muted-foreground">
                      {slot.type}
                    </span>
                  </div>
                  {slot.description ? (
                    <p className="text-[11px] text-muted-foreground">{slot.description}</p>
                  ) : null}
                  {candidates.length === 0 ? (
                    <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                      No {slot.type} credentials found.{' '}
                      <a
                        href="/workflows/credentials"
                        className="inline-flex items-center gap-0.5 underline"
                      >
                        Add one <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </p>
                  ) : (
                    <div className="relative">
                      <select
                        value={credMap[slot.key] ?? slot.satisfiedBy ?? ''}
                        onChange={(e) =>
                          setCredMap((prev) => ({ ...prev, [slot.key]: e.target.value }))
                        }
                        className="w-full appearance-none rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        aria-label={`Credential for ${slot.key}`}
                      >
                        {match && !candidates.find((c) => c.id === match.id) ? (
                          <option value={match.id}>{match.name}</option>
                        ) : null}
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {installError ? <p className="mb-3 text-xs text-destructive">{installError}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={installing}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void install()} disabled={installing || !slotsReady}>
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  const { data, error } = useApiData(() => listWorkflowTemplates({ published: true }));
  useGatewayErrorToast(error);
  const templates = data ?? [];

  const [q, setQ] = useState('');
  const [category, setCategory] = useState<WorkflowTemplateCategory | 'all'>('all');
  const [installing, setInstalling] = useState<WorkflowTemplateSummary | null>(null);

  const filtered = templates.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (q) {
      const lower = q.toLowerCase();
      return (
        t.name.toLowerCase().includes(lower) ||
        (t.description ?? '').toLowerCase().includes(lower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lower))
      );
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Workflow Templates"
        icon="Workflow"
        description="Browse ready-made workflow templates and install them in one click."
      />

      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              category === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            All
          </button>
          {WORKFLOW_TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                category === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              <CategoryIcon category={cat} className="h-3 w-3" />
              {CATEGORY_META[cat]?.label ?? cat}
            </button>
          ))}
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No templates match your filter.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('');
                setCategory('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onInstall={setInstalling} />
            ))}
          </div>
        )}
      </div>

      {installing ? (
        <InstallModal
          template={installing}
          onClose={() => setInstalling(null)}
          onInstalled={(workflowId) => {
            setInstalling(null);
            router.push(`/workflows/edit?id=${workflowId}`);
          }}
        />
      ) : null}
    </>
  );
}
