'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mic, MicOff, Pencil, Send } from 'lucide-react';
import type { CouncilFormat } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { StyledSelect } from '@/components/ui/styled-select';
import { FORMAT_SELECT_OPTIONS } from '@/lib/council-formats';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { cn } from '@/lib/utils';

type Props = {
  /** Whether a run can start right now (≥2 members, none live). */
  disabled: boolean;
  /** Why it's disabled, shown as the placeholder when relevant. */
  disabledHint?: string;
  /** The council's default synthesis format — the composer's initial pick. */
  defaultFormat: CouncilFormat;
  onSubmit: (prompt: string, format: CouncilFormat) => Promise<void>;
  /** Open the custom-prompt editor (rendered by the detail view). */
  onEditCustom: () => void;
};

/**
 * Free-form prompt input for a council run (slimmed PromptComposer): one prompt
 * per submission plus the synthesis format to distil it in. When the format is
 * Custom, a pencil button surfaces the reusable custom-prompt editor.
 * Cmd/Ctrl+Enter sends.
 */
export function CouncilComposer({
  disabled,
  disabledHint,
  defaultFormat,
  onSubmit,
  onEditCustom,
}: Props) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<CouncilFormat>(defaultFormat);
  const [submitting, setSubmitting] = useState(false);

  // Track the council default when it changes in the panel; a per-run pick (below)
  // still overrides it until the default itself moves.
  useEffect(() => {
    setFormat(defaultFormat);
  }, [defaultFormat]);

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
      await onSubmit(prompt, format);
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
          aria-label="Prompt for the council"
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
              : 'Put a prompt to the council — free-form, not a task.'
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
            <StyledSelect
              aria-label="Synthesis format"
              className="w-44"
              options={FORMAT_SELECT_OPTIONS}
              value={format}
              onChange={setFormat}
              disabled={disabled || submitting}
            />
            {format === 'custom' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit custom synthesis prompt"
                title="Edit the custom synthesis prompt"
                disabled={submitting}
                onClick={onEditCustom}
                className="h-8 w-8 text-muted-foreground"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!text.trim() || disabled || submitting}
            onClick={() => void submit()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Start
          </Button>
        </div>
      </div>
    </div>
  );
}
