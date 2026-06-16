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
  const onChangeRef = useRef(onConfigChange);
  onChangeRef.current = onConfigChange;

  // Debounce persistence so every keystroke doesn't write to localStorage.
  useEffect(() => {
    if (text === config.text) return;
    const id = setTimeout(() => onChangeRef.current({ text }), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, config.text]);

  return (
    <WidgetCard title="Scratchpad" icon={NotebookPen} bodyClassName="flex">
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
