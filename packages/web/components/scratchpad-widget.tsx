'use client';

import { useEffect, useRef, useState } from 'react';
import { NotebookPen } from 'lucide-react';
import type { WidgetConfig } from '@/lib/dashboard-widgets';
import { WidgetCard } from './widget-card';

type ScratchpadWidgetProps = {
  config: WidgetConfig['scratchpad'];
  onConfigChange: (config: WidgetConfig['scratchpad']) => void;
};

const DEBOUNCE_MS = 400;

export function ScratchpadWidget({ config, onConfigChange }: ScratchpadWidgetProps) {
  const [text, setText] = useState(config.text);
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

  return (
    <WidgetCard title={title} icon={NotebookPen} bodyClassName="flex">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot something down… (saved on this device)"
        spellCheck
        className="h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed focus-visible:outline-none"
      />
    </WidgetCard>
  );
}
