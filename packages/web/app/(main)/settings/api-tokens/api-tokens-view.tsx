'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { ServiceToken } from '@midnite/shared';
import { createServiceToken, listServiceTokens, revokeServiceToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function relativeTime(iso: string, t: Translate): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t('apiTokens.justNow');
  const m = Math.floor(s / 60);
  if (m < 60) return t('apiTokens.minutesAgo', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('apiTokens.hoursAgo', { count: h });
  const d = Math.floor(h / 24);
  return t('apiTokens.daysAgo', { count: d });
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// ── Modal shell ────────────────────────────────────────────────────────────────
// Matches the app-standard modal (new-task-modal / session-launch-modal): portalled
// to <body> with a blurred backdrop and a pointer-events-split positioning layer, so
// it can't be clipped by the settings layout's stacking/overflow context.

function ModalShell({
  label,
  onClose,
  busy = false,
  children,
}: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Create modal ─────────────────────────────────────────────────────────────

function CreateTokenModal({
  onCreated,
  onClose,
}: {
  onCreated: (secret: string, token: ServiceToken) => void;
  onClose: () => void;
}) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createServiceToken({
        name: name.trim(),
        ...(expiry ? { expiresAt: new Date(expiry).toISOString() } : {}),
      });
      onCreated(res.secret, res.token);
    } catch (err) {
      setError(errMsg(err, t('apiTokens.genericError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell label={t('apiTokens.createTitle')} onClose={onClose} busy={loading}>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t('apiTokens.createTitle')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('apiTokens.nameLabel')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('apiTokens.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('apiTokens.expiresLabel')}</label>
            <Input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>{tc('cancel')}</Button>
          <Button size="sm" onClick={() => void handleCreate()} disabled={loading || !name.trim()}>
            {loading ? t('apiTokens.creating') : t('apiTokens.createButton')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Secret reveal modal ───────────────────────────────────────────────────────

function SecretModal({
  secret,
  tokenName,
  onClose,
}: {
  secret: string;
  tokenName: string;
  onClose: () => void;
}) {
  const t = useTranslations('settings');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <ModalShell label={t('apiTokens.secretTitle', { name: tokenName })} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">{t('apiTokens.secretTitle', { name: tokenName })}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('apiTokens.secretWarning')}
        </p>
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
          <span className="flex-1 select-all">{secret}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded px-2 py-1 text-xs hover:bg-accent"
          >
            {copied ? t('apiTokens.copied') : t('apiTokens.copy')}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t.rich('apiTokens.secretUsage', {
            token: '<token>',
            code: (chunks) => <code className="bg-muted rounded px-1">{chunks}</code>,
          })}
        </p>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={onClose}>{t('apiTokens.done')}</Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function ApiTokensView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [tokens, setTokens] = useState<ServiceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ secret: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    listServiceTokens()
      .then((res) => setTokens(res.tokens))
      .catch((e) => setError(errMsg(e, t('apiTokens.genericError'))))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (secret: string, token: ServiceToken) => {
    setShowCreate(false);
    setCreatedSecret({ secret, name: token.name });
    setTokens((prev) => [token, ...prev]);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeServiceToken(id);
      setTokens((prev) => prev.filter((tok) => tok.id !== id));
    } catch (e) {
      setError(errMsg(e, t('apiTokens.genericError')));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('apiTokens.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('apiTokens.description')}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          {t('apiTokens.newToken')}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {tc('loading')}
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t('apiTokens.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">{t('apiTokens.nameLabel')}</th>
                <th className="px-4 py-2 text-left">{t('apiTokens.colPrefix')}</th>
                <th className="px-4 py-2 text-left">{t('apiTokens.colLastUsed')}</th>
                <th className="px-4 py-2 text-left">{t('apiTokens.colExpires')}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td className="px-4 py-3 font-medium">{token.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{token.prefix}…</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {token.lastUsedAt ? relativeTime(token.lastUsedAt, t) : t('apiTokens.never')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : t('apiTokens.never')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={revoking === token.id}
                      onClick={() => void handleRevoke(token.id)}
                    >
                      {revoking === token.id ? t('apiTokens.revoking') : t('apiTokens.revoke')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTokenModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {createdSecret && (
        <SecretModal
          secret={createdSecret.secret}
          tokenName={createdSecret.name}
          onClose={() => setCreatedSecret(null)}
        />
      )}
    </div>
  );
}
