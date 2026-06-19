'use client';

import { useState } from 'react';
import { Loader2, Mic, MicOff, Send } from 'lucide-react';
import {
  BRAINSTORM_SYNTH_MODES,
  BRAINSTORM_SYNTH_MODE_LABEL,
  type BrainstormSynthMode,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: SelectOption<BrainstormSynthMode>[] = BRAINSTORM_SYNTH_MODES.map((m) => ({
  value: m,
  label: BRAINSTORM_SYNTH_MODE_LABEL[m],
}));

type Props = {
  /** Whether a run can start right now (≥1 contributor, none live). */
  disabled: boolean;
  /** Why it's disabled, shown as the placeholder when relevant. */
  disabledHint?: string;
  /** The board's default synthesis mode — the composer's initial pick. */
  defaultMode: BrainstormSynthMode;
  onSubmit: (prompt: string, mode: BrainstormSynthMode) => Promise<void>;
};

/**
 * Free-form prompt input for a brainstorm run (slimmed PromptComposer): one
 * prompt per submission plus the synthesis mode to distill in. Cmd/Ctrl+Enter
 * sends.
 */
export function BrainstormPromptComposer({ disabled, disabledHint, defaultMode, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<BrainstormSynthMode>(defaultMode);
  const [submitting, setSubmitting] = useState(false);

  const speech = useSpeechRecognition({
    onFinal: (transcript) => {
      setText((prev) => (prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()));
    },
  });

  const submit = async () => {
    const prompt = text.trim();
    if (!prompt || disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(prompt, mode);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gradient-border relative z-10 rounded-xl shadow-sm transition-shadow duration-700 ease-out focus-within:shadow-lg motion-reduce:transition-none">
      {/* Opaque surface so the conic gradient reads as border + glow only. */}
      <div className="relative rounded-xl bg-card p-3">
        <textarea
          aria-label="Prompt for the brainstorm"
          className="min-h-[64px] w-full resize-y bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={speech.listening && speech.interim ? `${text} ${speech.interim}` : text}
          disabled={disabled || submitting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit();
          }}
          placeholder={
            disabled && disabledHint
              ? disabledHint
              : 'Put a challenge to the panel — free-form, not a task.'
          }
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {speech.supported ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={speech.listening ? 'Stop dictation' : 'Dictate prompt'}
                aria-pressed={speech.listening}
                disabled={disabled || submitting}
                onClick={speech.listening ? speech.stop : speech.start}
                className={cn('h-8 w-8', speech.listening && 'text-destructive')}
              >
                {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            ) : null}
            <Select
              aria-label="Synthesis mode"
              className="w-48"
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
              disabled={disabled || submitting}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!text.trim() || disabled || submitting}
            onClick={() => void submit()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Start brainstorm
          </Button>
        </div>
      </div>
    </div>
  );
}
