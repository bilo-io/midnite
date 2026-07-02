'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eye, NotebookPen, Pencil } from 'lucide-react';
import type { WidgetConfig } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';
import { MarkdownPreview } from './markdown-preview';
import { WidgetCard } from './widget-card';

type ScratchpadWidgetProps = {
  config: WidgetConfig['scratchpad'];
  onConfigChange: (config: WidgetConfig['scratchpad']) => void;
};

const DEBOUNCE_MS = 400;

export function ScratchpadWidget({ config, onConfigChange }: ScratchpadWidgetProps) {
  const [text, setText] = useState(config.text);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [editingTitle, setEditingTitle] = useState(false);
  const onChangeRef = useRef(onConfigChange);
  onChangeRef.current = onConfigChange;
  const cfgRef = useRef(config);
  cfgRef.current = config;

  // Debounce text persistence so every keystroke doesn't write to localStorage.
  useEffect(() => {
    if (text === config.text) return;
    const id = setTimeout(() => onChangeRef.current({ ...cfgRef.current, text }), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, config.text]);

  const commitTitle = (next: string) => {
    setEditingTitle(false);
    const title = next.trim() || 'Scratchpad';
    if (title !== config.title) onChangeRef.current({ ...cfgRef.current, title });
  };

  const title = editingTitle ? (
    <input
      autoFocus
      defaultValue={config.title}
      onBlur={(e) => commitTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value);
        else if (e.key === 'Escape') setEditingTitle(false);
      }}
      className="w-full min-w-0 rounded bg-transparent text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Scratchpad title"
    />
  ) : (
    <span
      className="cursor-text truncate"
      onDoubleClick={() => setEditingTitle(true)}
      title="Double-click to rename"
    >
      {config.title}
    </span>
  );

  const tab = (m: 'edit' | 'preview', icon: ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
        mode === m
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );

  const toggle = (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card/40 p-0.5">
      {tab('edit', <Pencil className="h-3.5 w-3.5" />, 'Edit')}
      {tab('preview', <Eye className="h-3.5 w-3.5" />, 'Preview')}
    </div>
  );

  return (
    <WidgetCard title={title} icon={NotebookPen} actions={toggle} bodyClassName="flex">
      {mode === 'edit' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot something down… (Markdown, saved on this device)"
          spellCheck
          aria-label="Scratchpad content"
          className="h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed focus-visible:outline-none"
        />
      ) : (
        <div className="h-full w-full overflow-y-auto px-4 py-3">
          {text.trim() ? (
            <MarkdownPreview content={text} />
          ) : (
            <p className="text-sm italic text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
