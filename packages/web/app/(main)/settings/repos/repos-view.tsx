'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  FolderGit2,
  GitBranch,
  Globe,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { Repo, WorkflowSummary } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/confirm-dialog';
import {
  createRepo,
  deleteRepo,
  getRepos,
  listWorkflows,
  rotateWorkflowWebhook,
  updateRepo,
} from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

const byName = (a: Repo, b: Repo) => a.name.localeCompare(b.name);

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <ClipboardCopy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function GithubWebhookSection({ repo }: { repo: Repo }) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const [selectedWfId, setSelectedWfId] = useState<string>('');
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; token: string } | null>(null);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    listWorkflows()
      .then((list) => {
        const webhook = list.filter((w) => w.triggerType === 'webhook');
        setWorkflows(webhook);
        if (webhook.length > 0 && !selectedWfId) setSelectedWfId(webhook[0]!.id);
      })
      .catch((e) => setError(errMsg(e)));
  }, [open, selectedWfId]);

  const generateUrl = async () => {
    if (!selectedWfId) return;
    setError(null);
    setRotating(true);
    try {
      const info = await rotateWorkflowWebhook(selectedWfId);
      setWebhookInfo(info);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Zap className="h-3.5 w-3.5" />
        GitHub webhook
        <ChevronDown
          className={`ml-auto h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            Link a webhook-trigger workflow to receive GitHub{' '}
            <code className="rounded bg-muted px-1 py-px">pull_request</code> events and
            automatically review PRs with Claude.
          </p>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {repo.ownerRepo ? (
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono">{repo.ownerRepo}</span>
            </div>
          ) : (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
              Set <strong>owner/repo</strong> on this repo to enable payload filtering.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Workflow</label>
            {workflows === null ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : workflows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No webhook-trigger workflows found. Install the{' '}
                <strong>AI Code Review</strong> template from{' '}
                <a href="/workflows/templates" className="underline">
                  Workflows → Templates
                </a>
                .
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedWfId}
                    onChange={(e) => {
                      setSelectedWfId(e.target.value);
                      setWebhookInfo(null);
                    }}
                    className="w-full appearance-none rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Select workflow"
                  >
                    {workflows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void generateUrl()}
                  disabled={rotating || !selectedWfId}
                >
                  {rotating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  {webhookInfo ? 'Regenerate' : 'Get URL'}
                </Button>
              </div>
            )}
          </div>

          {webhookInfo && (
            <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Save the secret now — it will not be shown again.
              </p>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1">
                  <code className="min-w-0 flex-1 truncate text-xs">{webhookInfo.url}</code>
                  <CopyButton value={webhookInfo.url} label="webhook URL" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Secret</p>
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1">
                  <code className="min-w-0 flex-1 truncate text-xs font-mono">{webhookInfo.token}</code>
                  <CopyButton value={webhookInfo.token} label="webhook secret" />
                </div>
              </div>

              <div className="space-y-1.5 rounded-md bg-background px-3 py-2.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Setup instructions</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Go to{' '}
                    {repo.ownerRepo ? (
                      <strong>{repo.ownerRepo}</strong>
                    ) : (
                      <strong>your GitHub repo</strong>
                    )}{' '}
                    → Settings → Webhooks → Add webhook.
                  </li>
                  <li>Paste the URL above into the Payload URL field.</li>
                  <li>
                    Set <strong>Content type</strong> to{' '}
                    <code className="rounded bg-muted px-1 py-px">application/json</code>.
                  </li>
                  <li>Paste the secret above into the Secret field.</li>
                  <li>
                    Under &ldquo;Which events…&rdquo;, choose{' '}
                    <strong>Let me select individual events</strong> and tick{' '}
                    <strong>Pull requests</strong> only.
                  </li>
                  <li>Click Add webhook.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Settings > Repos — CRUD over the DB-backed repo registry.
 */
export function ReposView() {
  const confirm = useConfirm();
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [ownerRepo, setOwnerRepo] = useState('');
  const [branchPrefix, setBranchPrefix] = useState('');
  const [prTemplate, setPrTemplate] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editOwnerRepo, setEditOwnerRepo] = useState('');
  const [editBranchPrefix, setEditBranchPrefix] = useState('');
  const [editPrTemplate, setEditPrTemplate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    getRepos()
      .then(setRepos)
      .catch((e) => {
        setRepos([]);
        setError(errMsg(e));
      });
  }, []);

  const onAdd = async () => {
    setError(null);
    if (!name.trim() || !path.trim()) {
      setError('Both a name and a path are required.');
      return;
    }
    setAdding(true);
    try {
      const created = await createRepo({
        name: name.trim(),
        path: path.trim(),
        ownerRepo: ownerRepo.trim() || undefined,
        branchPrefix: branchPrefix.trim() || undefined,
        prTemplate: prTemplate.trim() || undefined,
      });
      setRepos((prev) => [...(prev ?? []), created].sort(byName));
      setName('');
      setPath('');
      setOwnerRepo('');
      setBranchPrefix('');
      setPrTemplate('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (repo: Repo) => {
    setError(null);
    setEditingId(repo.id);
    setEditName(repo.name);
    setEditPath(repo.path);
    setEditOwnerRepo(repo.ownerRepo ?? '');
    setEditBranchPrefix(repo.branchPrefix ?? '');
    setEditPrTemplate(repo.prTemplate ?? '');
  };

  const onSaveEdit = async (id: string) => {
    setError(null);
    if (!editName.trim() || !editPath.trim()) {
      setError('Both a name and a path are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateRepo(id, {
        name: editName.trim(),
        path: editPath.trim(),
        ownerRepo: editOwnerRepo.trim() || undefined,
        branchPrefix: editBranchPrefix.trim(),
        prTemplate: editPrTemplate.trim(),
      });
      setRepos((prev) => (prev ?? []).map((r) => (r.id === id ? updated : r)).sort(byName));
      setEditingId(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const onRemove = async (repo: Repo) => {
    const ok = await confirm({
      title: `Remove "${repo.name}"?`,
      description: 'Tasks referencing it fall back to the default working directory.',
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteRepo(repo.id);
      setRepos((prev) => (prev ?? []).filter((r) => r.id !== repo.id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      <Accordion
        title="Repos"
        icon={<FolderGit2 className="h-3.5 w-3.5" />}
        count={repos?.length}
        defaultOpen
      >
        <div className="space-y-4 p-5">
          <p className="text-xs text-muted-foreground">
            Named checkouts the orchestrator runs agents against. A task&apos;s repo resolves to the
            checkout&apos;s folder when its session opens. Paths may use <code>~</code> for your home
            directory. Set <code>owner/repo</code> to enable GitHub webhook wiring.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {repos === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : repos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repos yet — add one below.</p>
          ) : (
            <ul className="space-y-2">
              {repos.map((repo) =>
                editingId === repo.id ? (
                  <li
                    key={repo.id}
                    className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        aria-label="Repo name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-32"
                      />
                      <Input
                        aria-label="Repo path"
                        value={editPath}
                        onChange={(e) => setEditPath(e.target.value)}
                        className="min-w-0 flex-1"
                      />
                    </div>
                    <Input
                      aria-label="GitHub owner/repo"
                      value={editOwnerRepo}
                      onChange={(e) => setEditOwnerRepo(e.target.value)}
                      placeholder="owner/repo (e.g. bilo-io/midnite)"
                    />
                    <Input
                      aria-label="Branch prefix"
                      value={editBranchPrefix}
                      onChange={(e) => setEditBranchPrefix(e.target.value)}
                      placeholder="Branch prefix (e.g. feature/)"
                    />
                    <Textarea
                      aria-label="PR template"
                      value={editPrTemplate}
                      onChange={(e) => setEditPrTemplate(e.target.value)}
                      placeholder="PR body template (optional)"
                      rows={3}
                    />
                    <GithubWebhookSection repo={{ ...repo, ownerRepo: editOwnerRepo || undefined }} />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => void onSaveEdit(repo.id)} disabled={savingEdit}>
                        <Check className="h-3.5 w-3.5" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={repo.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{repo.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{repo.path}</p>
                      {repo.ownerRepo || repo.branchPrefix || repo.prTemplate ? (
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {repo.ownerRepo ? (
                            <span className="inline-flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <code>{repo.ownerRepo}</code>
                            </span>
                          ) : null}
                          {repo.branchPrefix ? (
                            <span className="inline-flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              <code>{repo.branchPrefix}</code>
                            </span>
                          ) : null}
                          {repo.prTemplate ? <span>· PR template</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${repo.name}`}
                      onClick={() => startEdit(repo)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${repo.name}`}
                      onClick={() => void onRemove(repo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ),
              )}
            </ul>
          )}

          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label htmlFor="repo-name" className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  id="repo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="api"
                  className="w-32"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <label htmlFor="repo-path" className="text-xs font-medium text-muted-foreground">
                  Path
                </label>
                <Input
                  id="repo-path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="~/Dev/api"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="repo-owner-repo" className="text-xs font-medium text-muted-foreground">
                GitHub owner/repo <span className="font-normal">(optional)</span>
              </label>
              <Input
                id="repo-owner-repo"
                value={ownerRepo}
                onChange={(e) => setOwnerRepo(e.target.value)}
                placeholder="owner/repo"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="repo-branch-prefix"
                className="text-xs font-medium text-muted-foreground"
              >
                Branch prefix <span className="font-normal">(optional)</span>
              </label>
              <Input
                id="repo-branch-prefix"
                value={branchPrefix}
                onChange={(e) => setBranchPrefix(e.target.value)}
                placeholder="feature/"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="repo-pr-template" className="text-xs font-medium text-muted-foreground">
                PR template <span className="font-normal">(optional)</span>
              </label>
              <Textarea
                id="repo-pr-template"
                value={prTemplate}
                onChange={(e) => setPrTemplate(e.target.value)}
                placeholder="## Summary&#10;&#10;## Testing"
                rows={3}
              />
            </div>
            <Button onClick={() => void onAdd()} disabled={adding}>
              <Plus className="h-4 w-4" /> Add repo
            </Button>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
