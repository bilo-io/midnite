'use client';

import { useEffect, useState } from 'react';
import {
  INBOUND_PROVIDER_EVENTS,
  INBOUND_PROVIDERS,
  type InboundProvider,
  type InboundSource,
} from '@midnite/shared';
import {
  createInboundSource,
  deleteInboundSource,
  gatewayUrl,
  listInboundSources,
  rotateInboundSecret,
  updateInboundSource,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

function inbErr(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** The receiver URL a sender posts to, for a given source id. */
function receiverUrl(id: string): string {
  return `${gatewayUrl().replace(/\/$/, '')}/integrations/inbound/${id}`;
}

// ── Reveal-once secret modal ────────────────────────────────────────────────────

function InboundSecretModal({
  secret,
  url,
  onClose,
}: {
  secret: string;
  url: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<'secret' | 'url' | null>(null);
  const copy = (text: string, which: 'secret' | 'url') => {
    void navigator.clipboard?.writeText(text).then(() => setCopied(which));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">Source created</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Paste the signing secret into the sender&apos;s webhook config. It is shown{' '}
          <strong>once</strong> — rotate if you lose it.
        </p>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Receiver URL</label>
        <div className="mb-3 flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(url, 'url')}>
            {copied === 'url' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Signing secret</label>
        <div className="flex gap-2">
          <Input readOnly value={secret} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(secret, 'secret')}>
            {copied === 'secret' ? 'Copied' : 'Copy'}
          </Button>
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

// ── Add-source modal ────────────────────────────────────────────────────────────

function AddInboundSourceModal({
  onCreated,
  onClose,
}: {
  onCreated: (secret: string, url: string) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<InboundProvider>('github');
  const [events, setEvents] = useState<string[]>([]);
  const [genericEvents, setGenericEvents] = useState('');
  const [defaultRepo, setDefaultRepo] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = INBOUND_PROVIDER_EVENTS[provider];

  const toggleEvent = (ev: string) =>
    setEvents((cur) => (cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const chosen =
        provider === 'generic'
          ? genericEvents.split(',').map((s) => s.trim()).filter(Boolean)
          : events;
      const res = await createInboundSource({
        provider,
        eventFilter: { events: chosen },
        defaultRepo: defaultRepo.trim() || undefined,
        defaultProjectId: defaultProjectId.trim() || undefined,
        enabled: true,
      });
      onCreated(res.secret, receiverUrl(res.source.id));
    } catch (e) {
      setError(inbErr(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Add inbound source</h2>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">Provider</label>
        <select
          className="mb-4 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as InboundProvider);
            setEvents([]);
          }}
        >
          {INBOUND_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Events {provider !== 'generic' && '(none selected = accept all)'}
        </label>
        {provider === 'generic' ? (
          <Input
            className="mb-4"
            placeholder="comma-separated event keys (blank = accept all)"
            value={genericEvents}
            onChange={(e) => setGenericEvents(e.target.value)}
          />
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {catalog.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} />
                <span className="font-mono text-xs">{ev}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Default repo</label>
            <Input placeholder="optional" value={defaultRepo} onChange={(e) => setDefaultRepo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Default project id</label>
            <Input
              placeholder="optional"
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Creating…' : 'Create source'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────────

export function InboundSourcesSection() {
  const [sources, setSources] = useState<InboundSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [reveal, setReveal] = useState<{ secret: string; url: string } | null>(null);

  const load = () =>
    listInboundSources()
      .then((res) => setSources(res.sources))
      .catch((e) => setError(inbErr(e)));

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (s: InboundSource) => {
    setBusy(s.id);
    setError(null);
    try {
      await updateInboundSource(s.id, { enabled: !s.enabled });
      await load();
    } catch (e) {
      setError(inbErr(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const res = await rotateInboundSecret(id);
      setReveal({ secret: res.secret, url: receiverUrl(id) });
    } catch (e) {
      setError(inbErr(e));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await deleteInboundSource(id);
      await load();
    } catch (e) {
      setError(inbErr(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inbound sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Let GitHub, Linear, or any signed sender open tasks on your board.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          Add source
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {sources === null ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No inbound sources yet. Add one to receive external events.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Provider</th>
                <th className="p-3">Receiver URL</th>
                <th className="p-3">Events</th>
                <th className="p-3">Default routing</th>
                <th className="p-3">Enabled</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-medium">{s.provider}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{receiverUrl(s.id)}</td>
                  <td className="p-3 text-xs">
                    {s.eventFilter.events.length ? s.eventFilter.events.join(', ') : 'all events'}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {s.defaultRepo || s.defaultProjectId
                      ? [s.defaultRepo, s.defaultProjectId].filter(Boolean).join(' · ')
                      : '—'}
                  </td>
                  <td className="p-3">
                    <Switch checked={s.enabled} disabled={busy === s.id} onCheckedChange={() => void handleToggle(s)} />
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" disabled={busy === s.id} onClick={() => void handleRotate(s.id)}>
                      Rotate secret
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={busy === s.id}
                      onClick={() => void handleDelete(s.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddInboundSourceModal
          onCreated={(secret, url) => {
            setShowAdd(false);
            setReveal({ secret, url });
            void load();
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {reveal && (
        <InboundSecretModal secret={reveal.secret} url={reveal.url} onClose={() => setReveal(null)} />
      )}
    </div>
  );
}
