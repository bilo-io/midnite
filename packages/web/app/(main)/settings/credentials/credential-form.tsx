'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { WorkflowCredentialType, CreateWorkflowCredentialRequest, OAuthProvider } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { getOAuthStartUrl } from '@/lib/api';

type Props = {
  types: readonly WorkflowCredentialType[];
  typeLabels: Record<WorkflowCredentialType, string>;
  onSave: (req: CreateWorkflowCredentialRequest) => void;
  onCancel: () => void;
};

type FieldDef = { key: string; labelKey: string; type?: 'text' | 'password' | 'number'; placeholderKey?: string; required?: boolean };

const TYPE_FIELDS: Record<WorkflowCredentialType, FieldDef[]> = {
  'http-bearer': [{ key: 'token', labelKey: 'credentials.fields.bearerToken', type: 'password', required: true }],
  'http-basic': [
    { key: 'username', labelKey: 'credentials.fields.username', required: true },
    { key: 'password', labelKey: 'credentials.fields.password', type: 'password', required: true },
  ],
  'http-header': [
    { key: 'header', labelKey: 'credentials.fields.headerName', placeholderKey: 'credentials.fields.headerNamePlaceholder', required: true },
    { key: 'value', labelKey: 'credentials.fields.headerValue', type: 'password', required: true },
  ],
  slack: [{ key: 'token', labelKey: 'credentials.fields.botToken', type: 'password', placeholderKey: 'credentials.fields.botTokenPlaceholder', required: true }],
  smtp: [
    { key: 'host', labelKey: 'credentials.fields.smtpHost', placeholderKey: 'credentials.fields.smtpHostPlaceholder', required: true },
    { key: 'port', labelKey: 'credentials.fields.port', type: 'number', placeholderKey: 'credentials.fields.portPlaceholder', required: true },
    { key: 'username', labelKey: 'credentials.fields.usernameEmail', required: true },
    { key: 'password', labelKey: 'credentials.fields.password', type: 'password', required: true },
    { key: 'from', labelKey: 'credentials.fields.fromAddress', placeholderKey: 'credentials.fields.fromAddressPlaceholder' },
  ],
  github: [{ key: 'token', labelKey: 'credentials.fields.pat', type: 'password', placeholderKey: 'credentials.fields.patPlaceholder', required: true }],
  // OAuth types have no manual fields — the form renders an "Authorize" button instead.
  'google-oauth': [],
  'slack-oauth': [],
};

export function CredentialForm({ types, typeLabels, onSave, onCancel }: Props) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [credType, setCredType] = useState<WorkflowCredentialType>(types[0]!);
  const [fields, setFields] = useState<Record<string, string>>({});

  const fieldDefs = TYPE_FIELDS[credType] ?? [];

  const setField = (key: string, val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = buildData(credType, fields);
    if (!data) return;
    onSave({ name: name.trim(), data });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border/60 p-4">
      <h3 className="text-sm font-semibold">{t('credentials.form.title')}</h3>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="cred-name">{t('credentials.form.name')}</label>
        <input
          id="cred-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('credentials.form.namePlaceholder')}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="cred-type">{t('credentials.form.type')}</label>
        <select
          id="cred-type"
          value={credType}
          onChange={(e) => { setCredType(e.target.value as WorkflowCredentialType); setFields({}); }}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        >
          {types.map((t) => (
            <option key={t} value={t}>{typeLabels[t]}</option>
          ))}
        </select>
      </div>

      {fieldDefs.map(({ key, labelKey, type = 'text', placeholderKey, required }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`cred-${key}`}>{t(labelKey)}</label>
          <input
            id={`cred-${key}`}
            type={type}
            value={fields[key] ?? ''}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={placeholderKey ? t(placeholderKey) : undefined}
            required={required}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ))}

      {isOAuthType(credType) && (
        <p className="text-xs text-muted-foreground">
          {t('credentials.form.oauthNote')}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {isOAuthType(credType) ? (
          <Button
            type="button"
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              if (!name.trim()) return;
              window.location.href = getOAuthStartUrl(
                oauthProvider(credType)!,
                name.trim(),
                window.location.href,
              );
            }}
          >
            {t('credentials.form.authorize')}
          </Button>
        ) : (
          <Button type="submit" size="sm">{tc('save')}</Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{tc('cancel')}</Button>
      </div>
    </form>
  );
}

function buildData(type: WorkflowCredentialType, f: Record<string, string>): CreateWorkflowCredentialRequest['data'] | null {
  switch (type) {
    case 'http-bearer':
      if (!f['token']) return null;
      return { type, token: f['token'] };
    case 'http-basic':
      if (!f['username'] || !f['password']) return null;
      return { type, username: f['username'], password: f['password'] };
    case 'http-header':
      if (!f['header'] || !f['value']) return null;
      return { type, header: f['header'], value: f['value'] };
    case 'slack':
      if (!f['token']) return null;
      return { type, token: f['token'] };
    case 'smtp': {
      const port = parseInt(f['port'] ?? '587', 10);
      if (!f['host'] || !f['username'] || !f['password'] || isNaN(port)) return null;
      return {
        type,
        host: f['host'],
        port,
        username: f['username'],
        password: f['password'],
        from: f['from'] || undefined,
      };
    }
    case 'github':
      if (!f['token']) return null;
      return { type, token: f['token'] };
    // OAuth types are created via the start/callback flow, not the form.
    case 'google-oauth':
    case 'slack-oauth':
      return null;
    default:
      return null;
  }
}

const OAUTH_TYPE_MAP: Partial<Record<WorkflowCredentialType, OAuthProvider>> = {
  'google-oauth': 'google',
  'slack-oauth': 'slack',
};

function isOAuthType(t: WorkflowCredentialType): boolean {
  return t in OAUTH_TYPE_MAP;
}

function oauthProvider(t: WorkflowCredentialType): OAuthProvider | undefined {
  return OAUTH_TYPE_MAP[t];
}
