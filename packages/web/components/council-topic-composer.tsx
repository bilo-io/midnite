'use client';

import { useState } from 'react';
import { Loader2, Mic, MicOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { cn } from '@/lib/utils';

type Props = {
  /** Whether a run can start right now (≥2 participants, none live). */
  disabled: boolean;
  /** Why it's disabled, shown as the placeholder when relevant. */
  disabledHint?: string;
  onSubmit: (topic: string) => Promise<void>;
};

/**
 * Free-form topic input for a council debate (slimmed PromptComposer): one
 * topic per submission, no task drafting, no attachments. Cmd/Ctrl+Enter sends.
 */
export function CouncilTopicComposer({ disabled, disabledHint, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const speech = useSpeechRecognition({
    onFinal: (transcript) => {
      setText((prev) => (prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()));
    },
  });

  const submit = async () => {
    const topic = text.trim();
    if (!topic || disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(topic);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <textarea
        aria-label="Topic for the council"
        className="min-h-[64px] w-full resize-y bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        value={speech.listening && speech.interim ? `${text} ${speech.interim}` : text}
        disabled={disabled || submitting}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit();
        }}
        placeholder={
          disabled && disabledHint ? disabledHint : 'Put a topic to the council — free-form, not a task.'
        }
      />
      <div className="flex items-center justify-between gap-2">
        <div>
          {speech.supported ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={speech.listening ? 'Stop dictation' : 'Dictate topic'}
              aria-pressed={speech.listening}
              disabled={disabled || submitting}
              onClick={speech.listening ? speech.stop : speech.start}
              className={cn('h-8 w-8', speech.listening && 'text-destructive')}
            >
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
          Start debate
        </Button>
      </div>
    </div>
  );
}
