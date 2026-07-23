'use client';

import { Fragment, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  INBOUND_PROVIDER_EVENTS,
  INBOUND_PROVIDERS,
  type InboundDelivery,
  type InboundProvider,
  type InboundResult,
  type InboundSource,
} from '@midnite/shared';
import {
  createInboundSource,
  deleteInboundSource,
  gatewayUrl,
  listInboundDeliveries,
  listInboundSources,
  rotateInboundSecret,
  updateInboundSource,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/** The receiver URL a sender posts to, for a given source id. */
function receiverUrl(id: string): string {
  return `${gatewayUrl().replace(/\/$/, '')}/integrations/inbound/${id}`;
}

/** Colour each delivery outcome so the log scans at a glance. */
const RESULT_STYLE: Record<InboundResult, string> = {
  created: 'text-emerald-500',
  'skipped-duplicate': 'text-amber-500',
  rejected: 'text-destructive',
  ignored: 'text-muted-foreground',
  failed: 'text-destructive',
};

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
  const t = useTranslations('settings');
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
        <h2 className="mb-2 text-lg font-semibold">{t('integrations.inbound.created.title')}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t.rich('integrations.inbound.created.description', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('integrations.inbound.created.receiverUrl')}
        </label>
        <div className="mb-3 flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(url, 'url')}>
            {copied === 'url'
              ? t('integrations.inbound.created.copied')
              : t('integrations.inbound.created.copy')}
          </Button>
        </div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('integrations.inbound.created.signingSecret')}
        </label>
        <div className="flex gap-2">
          <Input readOnly value={secret} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(secret, 'secret')}>
            {copied === 'secret'
              ? t('integrations.inbound.created.copied')
              : t('integrations.inbound.created.copy')}
          </Button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={onClose}>
            {t('integrations.inbound.created.done')}
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
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const inbErr = (e: unknown): string =>
    e instanceof Error ? e.message : t('integrations.errors.generic');
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
        <h2 className="mb-4 text-lg font-semibold">{t('integrations.inbound.add.title')}</h2>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('integrations.inbound.add.provider')}
        </label>
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
          {t('integrations.inbound.add.events')}{' '}
          {provider !== 'generic' && t('integrations.inbound.add.eventsHint')}
        </label>
        {provider === 'generic' ? (
          <Input
            className="mb-4"
            placeholder={t('integrations.inbound.add.genericPlaceholder')}
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('integrations.inbound.add.defaultRepo')}
            </label>
            <Input
              placeholder={t('integrations.inbound.add.optional')}
              value={defaultRepo}
              onChange={(e) => setDefaultRepo(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('integrations.inbound.add.defaultProjectId')}
            </label>
            <Input
              placeholder={t('integrations.inbound.add.optional')}
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            {tc('cancel')}
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={busy}>
            {busy
              ? t('integrations.inbound.add.creating')
              : t('integrations.inbound.add.createSource')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────────

/** Lazy-loaded per-source deliveries log (Theme D), rendered in an expanded row. */
function DeliveriesLog({ sourceId }: { sourceId: string }) {
  const t = useTranslations('settings');
  const inbErr = (e: unknown): string =>
    e instanceof Error ? e.message : t('integrations.errors.generic');
  const [rows, setRows] = useState<InboundDelivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listInboundDeliveries(sourceId)
      .then((res) => live && setRows(res.deliveries))
      .catch((e) => live && setError(inbErr(e)));
    return () => {
      live = false;
    };
  }, [sourceId]);

  if (error) return <p className="p-3 text-sm text-destructive">{error}</p>;
  if (rows === null)
    return (
      <p className="p-3 text-sm text-muted-foreground">
        {t('integrations.inbound.deliveriesLog.loading')}
      </p>
    );
  if (rows.length === 0)
    return (
      <p className="p-3 text-sm text-muted-foreground">
        {t('integrations.inbound.deliveriesLog.empty')}
      </p>
    );

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="px-3 py-2">{t('integrations.inbound.deliveriesLog.result')}</th>
          <th className="px-3 py-2">{t('integrations.inbound.deliveriesLog.event')}</th>
          <th className="px-3 py-2">{t('integrations.inbound.deliveriesLog.task')}</th>
          <th className="px-3 py-2">{t('integrations.inbound.deliveriesLog.when')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.id} className="border-t border-border/40">
            <td className={`px-3 py-2 font-medium ${RESULT_STYLE[d.result]}`}>{d.result}</td>
            <td className="px-3 py-2 text-muted-foreground">{d.event ?? '—'}</td>
            <td className="px-3 py-2">
              {d.taskId ? (
                <a className="text-primary hover:underline" href={`/tasks/view?id=${encodeURIComponent(d.taskId)}`}>
                  {t('integrations.inbound.deliveriesLog.viewTask')}
                </a>
              ) : d.error ? (
                <span className="text-destructive" title={d.error}>
                  {d.error.length > 40 ? `${d.error.slice(0, 40)}…` : d.error}
                </span>
              ) : (
                '—'
              )}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InboundSourcesSection() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const inbErr = (e: unknown): string =>
    e instanceof Error ? e.message : t('integrations.errors.generic');
  const [sources, setSources] = useState<InboundSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [reveal, setReveal] = useState<{ secret: string; url: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          <h2 className="text-lg font-semibold">{t('integrations.inbound.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('integrations.inbound.subtitle')}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          {t('integrations.inbound.addSource')}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {sources === null ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {tc('loading')}
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t('integrations.inbound.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">{t('integrations.inbound.columns.provider')}</th>
                <th className="p-3">{t('integrations.inbound.columns.receiverUrl')}</th>
                <th className="p-3">{t('integrations.inbound.columns.events')}</th>
                <th className="p-3">{t('integrations.inbound.columns.defaultRouting')}</th>
                <th className="p-3">{t('integrations.inbound.columns.enabled')}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-border/50 last:border-0">
                    <td className="p-3 font-medium">{s.provider}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{receiverUrl(s.id)}</td>
                    <td className="p-3 text-xs">
                      {s.eventFilter.events.length
                        ? s.eventFilter.events.join(', ')
                        : t('integrations.inbound.allEvents')}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={expanded === s.id}
                        onClick={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
                      >
                        {expanded === s.id
                          ? t('integrations.inbound.hideDeliveries')
                          : t('integrations.inbound.deliveries')}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy === s.id} onClick={() => void handleRotate(s.id)}>
                        {t('integrations.inbound.rotateSecret')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busy === s.id}
                        onClick={() => void handleDelete(s.id)}
                      >
                        {tc('delete')}
                      </Button>
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr className="border-b border-border/50 bg-muted/30 last:border-0">
                      <td colSpan={6} className="p-0">
                        <DeliveriesLog sourceId={s.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
