'use client';

import { useState } from 'react';
import type { WorkflowCredentialType, CreateWorkflowCredentialRequest } from '@midnite/shared';
import { Button } from '@/components/ui/button';

type Props = {
  types: readonly WorkflowCredentialType[];
  typeLabels: Record<WorkflowCredentialType, string>;
  onSave: (req: CreateWorkflowCredentialRequest) => void;
  onCancel: () => void;
};

type FieldDef = { key: string; label: string; type?: 'text' | 'password' | 'number'; placeholder?: string; required?: boolean };

const TYPE_FIELDS: Record<WorkflowCredentialType, FieldDef[]> = {
  'http-bearer': [{ key: 'token', label: 'Bearer token', type: 'password', required: true }],
  'http-basic': [
    { key: 'username', label: 'Username', required: true },
    { key: 'password', label: 'Password', type: 'password', required: true },
  ],
  'http-header': [
    { key: 'header', label: 'Header name', placeholder: 'X-API-Key', required: true },
    { key: 'value', label: 'Header value', type: 'password', required: true },
  ],
  slack: [{ key: 'token', label: 'Bot token', type: 'password', placeholder: 'xoxb-…', required: true }],
  smtp: [
    { key: 'host', label: 'SMTP host', placeholder: 'smtp.example.com', required: true },
    { key: 'port', label: 'Port', type: 'number', placeholder: '587', required: true },
    { key: 'username', label: 'Username / email', required: true },
    { key: 'password', label: 'Password', type: 'password', required: true },
    { key: 'from', label: 'From address (optional)', placeholder: 'sender@example.com' },
  ],
};

export function CredentialForm({ types, typeLabels, onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [credType, setCredType] = useState<WorkflowCredentialType>(types[0]);
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
      <h3 className="text-sm font-semibold">New credential</h3>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="cred-name">Name</label>
        <input
          id="cred-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Slack bot"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="cred-type">Type</label>
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

      {fieldDefs.map(({ key, label, type = 'text', placeholder, required }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`cred-${key}`}>{label}</label>
          <input
            id={`cred-${key}`}
            type={type}
            value={fields[key] ?? ''}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm">Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
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
    default:
      return null;
  }
}
