'use client';

import { useState } from 'react';
import { ExternalLink, Link as LinkIcon, Settings2, Trash2, X } from 'lucide-react';
import type { QuickLink, WidgetConfig } from '@/lib/dashboard-widgets';
import { WidgetCard } from './widget-card';

type LinksWidgetProps = {
  config: WidgetConfig['links'];
  onConfigChange: (config: WidgetConfig['links']) => void;
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export function LinksWidget({ config, onConfigChange }: LinksWidgetProps) {
  const [editing, setEditing] = useState(false);
  const { links } = config;

  const addLink = (link: QuickLink) => onConfigChange({ links: [...links, link] });
  const removeLink = (index: number) => onConfigChange({ links: links.filter((_, i) => i !== index) });

  return (
    <WidgetCard
      title="Quick links"
      icon={LinkIcon}
      actions={
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? 'Done editing' : 'Edit links'}
          aria-pressed={editing}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
        </button>
      }
      bodyClassName="overflow-auto p-3"
    >
      {editing ? (
        <LinksEditor links={links} onAdd={addLink} onRemove={removeLink} />
      ) : links.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No links — add some with the gear.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {links.map((link, i) => (
            <a
              key={`${link.url}-${i}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-sm transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{link.label}</span>
            </a>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function LinksEditor({
  links,
  onAdd,
  onRemove,
}: {
  links: QuickLink[];
  onAdd: (link: QuickLink) => void;
  onRemove: (index: number) => void;
}) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const normalized = normalizeUrl(url);
  const valid = label.trim() !== '' && normalized !== null;

  const submit = () => {
    if (!valid || !normalized) return;
    onAdd({ label: label.trim(), url: normalized });
    setLabel('');
    setUrl('');
  };

  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link, i) => (
            <li key={`${link.url}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">
                {link.label} <span className="text-muted-foreground">· {link.url}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${link.label}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="URL"
          inputMode="url"
          className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add link
        </button>
      </div>
    </div>
  );
}
