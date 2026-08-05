'use client';

import { useTranslations } from 'next-intl';
import type { ChatInferencePath } from '@midnite/shared';
import { CornerDownLeft, LoaderCircle, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatCommandState } from '@/hooks/use-chat-command';
import { cn } from '@/lib/utils';

// Deliberately **not** translated: these are literal commands for the
// English-grammar parser (`shared/src/chat.ts`) — a translated verb wouldn't
// parse, so the examples stay verbatim in every locale.
const EXAMPLES = [
  'add "fix login bug" p1 repo:api',
  'move "add logout" to wip',
  'break "ship billing" into tasks',
];

/**
 * Phase 59 E — the chat-to-board command panel rendered inside the Cmd-K palette
 * when the query starts with `>`. Presentational: all state lives in
 * {@link ChatCommandState} (useChatCommand). Shows the parsed intent + cost line,
 * gates a mutating command behind Confirm (Theme F seatbelt), and offers an
 * inline Undo after execution.
 */
export function ChatBar({ command, state }: { command: string; state: ChatCommandState }) {
  const t = useTranslations('sessions');
  const tc = useTranslations('common');
  const { phase, preview, result, affectedCount, error, canUndo } = state;

  return (
    <div className="px-3 py-3" data-testid="chat-bar">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" /> {t('chatBar.title')}
      </div>

      {/* Idle: hint + examples until the user runs something. */}
      {phase === 'idle' && !result && (
        <div className="mt-2 text-sm text-muted-foreground">
          {command.trim() ? (
            <p className="flex items-center gap-1.5">
              {t.rich('chatBar.pressEnterToPreview', {
                kbd: (chunks) => (
                  <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
                    {chunks}
                  </kbd>
                ),
              })}
              <span className="truncate font-mono text-foreground">
                {t('chatBar.quotedCommand', { command: command.trim() })}
              </span>
            </p>
          ) : (
            <>
              <p>{t('chatBar.examplesIntro')}</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                {EXAMPLES.map((e) => (
                  <li key={e} className="truncate">
                    {t('chatBar.exampleItem', { example: e })}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {phase === 'running' && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-label={tc('chrome.working')} />{' '}
          {t('chatBar.working')}
        </p>
      )}

      {/* Confirm gate for a mutating command. */}
      {phase === 'confirm' && preview && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-foreground">{preview.description}</p>
          {affectedCount > 1 && (
            <p className="text-xs text-muted-foreground">
              {t('chatBar.appliesTo', { count: affectedCount })}
            </p>
          )}
          <CostLine path={preview.parse.inferencePath} confidence={preview.parse.confidence} />
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={state.confirm} data-testid="chat-confirm">
              {tc('confirm')}
            </Button>
            <Button size="sm" variant="ghost" onClick={state.cancel}>
              {tc('cancel')}
            </Button>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" /> {t('chatBar.enterToConfirm')}
            </span>
          </div>
        </div>
      )}

      {/* Result + inline Undo. */}
      {phase === 'done' && result && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-foreground" data-testid="chat-result">{result.summary}</p>
          <div className="flex items-center gap-2">
            <CostLine path={result.inferencePath} />
            {canUndo && (
              <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={state.undo} data-testid="chat-undo">
                <RotateCcw className="h-3.5 w-3.5" /> {t('chatBar.undo')}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'error' && (
        <p className="mt-2 flex items-center gap-2 text-sm text-destructive" role="alert">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/**
 * The cost-transparency line ("parsed locally — no AI used" / via local / via provider).
 *
 * The path→copy map lives in `sessions.chatBar.inferencePath.*` rather than being read
 * from `CHAT_INFERENCE_PATH_LABEL` (which is untranslated English in `shared`): the
 * union of paths is the shared contract, the human copy is a web-side concern.
 */
function CostLine({ path, confidence }: { path: ChatInferencePath; confidence?: number }) {
  const t = useTranslations('sessions');
  const lowConfidence = confidence !== undefined && confidence < 0.5;
  return (
    <p className={cn('flex items-center gap-1.5 text-[11px]', lowConfidence ? 'text-amber-500' : 'text-muted-foreground')}>
      {lowConfidence && <TriangleAlert className="h-3 w-3" />}
      {lowConfidence ? `${t('chatBar.lowConfidence')} ` : ''}
      {t(`chatBar.inferencePath.${path}`)}
    </p>
  );
}
