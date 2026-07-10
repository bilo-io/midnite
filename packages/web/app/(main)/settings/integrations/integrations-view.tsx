'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  STATUSES,
  WEBHOOK_EVENTS,
  WEBHOOK_PROVIDERS,
  type Status,
  type Webhook,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookProvider,
} from '@midnite/shared';
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  redeliverWebhook,
  rotateWebhookSecret,
  sendWebhookTest,
  updateWebhook,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { InboundSourcesSection } from './inbound-sources-section';

function fmtTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return iso;
  }
}

// ── Deliveries panel ──────────────────────────────────────────────────────────

function DeliveriesPanel({ webhookId }: { webhookId: string }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);

  const load = () =>
    listWebhookDeliveries(webhookId)
      .then((res) => setDeliveries(res.deliveries))
      .catch((e) => setError(errMsg(e)));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for this id
  }, [webhookId]);

  const handleRedeliver = async (deliveryId: string) => {
    setRedelivering(deliveryId);
    try {
      await redeliverWebhook(webhookId, deliveryId);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRedelivering(null);
    }
  };

  if (error) return <p className="px-4 py-3 text-xs text-destructive">{error}</p>;
  if (!deliveries) return <p className="px-4 py-3 text-xs text-muted-foreground">Loading deliveries…</p>;
  if (deliveries.length === 0)
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        No deliveries yet. Move a matching task — or hit “Send test”.
      </p>
    );

  return (
    <table className="w-full text-xs">
      <tbody className="divide-y divide-border/60">
        {deliveries.map((d) => (
          <tr key={d.id}>
            <td className="px-4 py-2">
              <span
                className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                  d.status === 'success'
                    ? 'bg-success/15 text-success'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {d.status}
              </span>
            </td>
            <td className="px-4 py-2 text-muted-foreground">{d.event.replace('task.', '')}</td>
            <td className="px-4 py-2 font-mono text-muted-foreground">
              {d.responseCode ?? (d.error ? 'err' : '—')}
            </td>
            <td className="px-4 py-2 text-muted-foreground">{fmtTime(d.createdAt)}</td>
            <td className="px-4 py-2 text-right">
              <Button
                variant="ghost"
                size="sm"
                disabled={redelivering === d.id}
                onClick={() => void handleRedeliver(d.id)}
              >
                {redelivering === d.id ? 'Redelivering…' : 'Redeliver'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const PROVIDER_LABEL: Record<WebhookProvider, string> = {
  slack: 'Slack',
  discord: 'Discord',
  generic: 'Generic',
};

function eventsSummary(w: Webhook): string {
  const evs = w.eventFilter.events.map((e) => e.replace('task.', '')).join(', ');
  const st = w.eventFilter.statuses?.length ? ` → ${w.eventFilter.statuses.join('/')}` : '';
  return evs + st;
}

// ── Create modal ────────────────────────────────────────────────────────────

function CreateWebhookModal({
  onCreated,
  onClose,
}: {
  onCreated: (secret: string, webhook: Webhook) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState<WebhookProvider>('slack');
  const [events, setEvents] = useState<WebhookEvent[]>(['task.updated']);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (e: WebhookEvent) =>
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  const toggleStatus = (s: Status) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const canSubmit = url.trim().length > 0 && events.length > 0 && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createWebhook({
        url: url.trim(),
        provider,
        eventFilter: { events, ...(statuses.length ? { statuses } : {}) },
        enabled: true,
      });
      onCreated(res.secret, res.webhook);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Add webhook endpoint</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payload URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as WebhookProvider)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {WEBHOOK_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Events</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEvent(e)}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    events.includes(e)
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {e.replace('task.', '')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Only on these statuses <span className="text-muted-foreground">(optional, for updates)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    statuses.includes(s)
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleCreate()} disabled={!canSubmit}>
            {loading ? 'Creating…' : 'Add endpoint'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Secret reveal modal ───────────────────────────────────────────────────────

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-2">Signing secret</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Copy this now — it will not be shown again. Use it to verify the{' '}
          <code className="bg-muted rounded px-1">X-Midnite-Signature</code> header.
        </p>
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
          <span className="flex-1 select-all">{secret}</span>
          <button onClick={handleCopy} className="shrink-0 rounded px-2 py-1 text-xs hover:bg-accent">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function IntegrationsView() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<{ id: string; ok: boolean } | null>(null);

  useEffect(() => {
    listWebhooks()
      .then((res) => setWebhooks(res.webhooks))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (secret: string, webhook: Webhook) => {
    setShowCreate(false);
    setWebhooks((prev) => [webhook, ...prev]);
    setRevealedSecret(secret);
  };

  const handleToggle = async (w: Webhook) => {
    setBusy(w.id);
    try {
      const res = await updateWebhook(w.id, { enabled: !w.enabled });
      setWebhooks((prev) => prev.map((x) => (x.id === w.id ? res.webhook : x)));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async (id: string) => {
    setBusy(id);
    try {
      const res = await rotateWebhookSecret(id);
      setRevealedSecret(res.secret);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(id);
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const handleSendTest = async (id: string) => {
    setBusy(id);
    setTestNote(null);
    try {
      const res = await sendWebhookTest(id);
      setTestNote({ id, ok: res.delivery.status === 'success' });
      setExpanded(id); // reveal the deliveries log so the test shows up
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleExpanded = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Outbound webhooks — push task events to Slack, Discord, or any receiver.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add endpoint
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No webhook endpoints yet. Add one to push task events to a channel or service.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-left">Target</th>
                <th className="px-4 py-2 text-left">Events</th>
                <th className="px-4 py-2 text-left">Enabled</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {webhooks.map((w) => (
                <Fragment key={w.id}>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {PROVIDER_LABEL[w.provider]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{hostOf(w.url)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{eventsSummary(w)}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={w.enabled}
                        disabled={busy === w.id}
                        onCheckedChange={() => void handleToggle(w)}
                        aria-label={`Toggle ${hostOf(w.url)}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {testNote?.id === w.id && (
                        <span
                          className={`mr-2 text-xs ${testNote.ok ? 'text-success' : 'text-destructive'}`}
                        >
                          {testNote.ok ? '✓ test sent' : '✗ test failed'}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === w.id}
                        onClick={() => void handleSendTest(w.id)}
                      >
                        Send test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(w.id)}
                        aria-expanded={expanded === w.id}
                      >
                        {expanded === w.id ? 'Hide log' : 'Deliveries'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === w.id}
                        onClick={() => void handleRotate(w.id)}
                      >
                        Rotate secret
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busy === w.id}
                        onClick={() => void handleDelete(w.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                  {expanded === w.id && (
                    <tr>
                      <td colSpan={5} className="bg-muted/30 p-0">
                        <DeliveriesPanel webhookId={w.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateWebhookModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {revealedSecret && (
        <SecretModal secret={revealedSecret} onClose={() => setRevealedSecret(null)} />
      )}

      <InboundSourcesSection />
    </div>
  );
}
