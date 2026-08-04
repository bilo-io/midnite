'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { AssistantBlock, AssistantInferencePath, Locale } from '@midnite/shared';

import { assistantQuery } from '@/lib/api';
import { AssistantBlockView } from './assistant-blocks';

/**
 * Phase 66 E — the fleet assistant chat. A self-contained, **ephemeral** (no
 * server-side history) transcript: ask about the fleet/tasks/sessions and get an
 * answer rendered as ordered blocks (markdown + inline midnite components). This
 * is the standalone surface; Theme A's floating panel embeds it later. Read-only
 * — it never mutates the board.
 */

type Turn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; blocks: AssistantBlock[]; inferencePath: AssistantInferencePath }
  | { role: 'error'; text: string };

export function AgentChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const t = useTranslations('assistant');
  // The answer itself is model output, so the active locale rides on the request
  // and the gateway tells the model which language to write in (Phase 82 D) —
  // the same seam the memory chat uses.
  const locale = useLocale() as Locale;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: question }]);
    setBusy(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await assistantQuery(question, locale, ctrl.signal);
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', blocks: res.blocks, inferencePath: res.inferencePath },
      ]);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setTurns((prev) => [
        ...prev,
        { role: 'error', text: err instanceof Error ? err.message : t('agent.failed') },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3" aria-label={t('agent.label')}>
      <div className="flex-1 space-y-4 overflow-y-auto" role="log" aria-live="polite">
        {turns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.rich('agent.empty', { em: (chunks) => <em>{chunks}</em> })}
          </p>
        ) : (
          turns.map((turn, i) => <TurnView key={i} turn={turn} />)
        )}
        {busy ? <p className="text-sm text-muted-foreground">{t('agent.thinking')}</p> : null}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
          rows={1}
          placeholder={t('agent.placeholder')}
          aria-label={t('agent.inputLabel')}
          className="min-h-[2.5rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t('agent.ask')}
        </button>
      </form>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const t = useTranslations('assistant');
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{turn.text}</div>
      </div>
    );
  }
  if (turn.role === 'error') {
    return <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{turn.text}</div>;
  }
  return (
    <div className="space-y-2">
      {turn.blocks.map((block, i) => (
        <AssistantBlockView key={i} block={block} />
      ))}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t(`agent.path.${turn.inferencePath}`)}
      </p>
    </div>
  );
}
