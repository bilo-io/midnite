'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Mic, MicOff, Pencil, Send } from 'lucide-react';
import type { CouncilFormat } from '@midnite/shared';
import { GradientGlow } from '@midnite/ui';
import { Button } from '@/components/ui/button';
import { StyledSelect } from '@/components/ui/styled-select';
import {
  ComposerFullscreen,
  ComposerFullscreenToggle,
  useComposerFullscreen,
} from '@/components/composer-fullscreen';
import { useFormatSelectOptions } from '@/lib/council-formats';
import { useAutoResizeTextarea } from '@/lib/use-auto-resize-textarea';
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
  const t = useTranslations('council');
  const formatOptions = useFormatSelectOptions();
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

  const { full, toggle, close } = useComposerFullscreen();

  // Compact when idle; opens up on focus and grows with content up to a cap.
  // Full-screen gives the box a roomy, modal-sized floor.
  const displayText = speech.listening && speech.interim ? `${text} ${speech.interim}` : text;
  const ta = useAutoResizeTextarea(
    displayText,
    full ? { collapsed: 360, expanded: 360, max: 520 } : { collapsed: 40, expanded: 64, max: 220 },
  );

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
    <ComposerFullscreen full={full} onClose={close}>
      <GradientGlow className="relative z-10 rounded-xl shadow-sm transition-shadow duration-700 ease-out focus-within:shadow-lg motion-reduce:transition-none">
        {/* Opaque surface so the conic gradient reads as border + glow only. */}
        <div className="relative rounded-xl bg-card p-3">
          <ComposerFullscreenToggle full={full} onToggle={toggle} />
          <textarea
            ref={ta.ref}
            aria-label={t('composer.label')}
            className="w-full resize-none overflow-y-auto bg-transparent pr-8 text-sm placeholder:text-muted-foreground transition-[height] duration-300 ease-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            value={displayText}
            disabled={disabled || submitting}
            onFocus={ta.onFocus}
            onBlur={ta.onBlur}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit();
            }}
            placeholder={
              disabled && disabledHint ? disabledHint : t('composer.placeholder')
            }
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {speech.supported ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={speech.listening ? t('composer.stopDictation') : t('composer.dictate')}
                  aria-pressed={speech.listening}
                  disabled={disabled || submitting}
                  onClick={speech.listening ? speech.stop : speech.start}
                  className={cn('h-8 w-8', speech.listening && 'text-destructive')}
                >
                  {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              ) : null}
              <StyledSelect
                aria-label={t('composer.formatLabel')}
                className="w-fit shrink-0"
                options={formatOptions}
                value={format}
                onChange={setFormat}
                disabled={disabled || submitting}
              />
              {format === 'custom' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('composer.editCustom')}
                  title={t('composer.editCustomTitle')}
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
              {t('composer.start')}
            </Button>
          </div>
        </div>
      </GradientGlow>
    </ComposerFullscreen>
  );
}
