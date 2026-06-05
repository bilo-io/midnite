'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createTask } from '@/lib/api';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';

type Phase = 'idle' | 'submitting';

function splitTasks(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PromptComposer() {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Intro: start centered + compact, then settle to the bottom at full height.
  const [intro, setIntro] = React.useState(true);
  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIntro(false);
      return;
    }
    const id = setTimeout(() => setIntro(false), 450);
    return () => clearTimeout(id);
  }, []);

  const speech = useSpeechRecognition({
    onFinal: (transcript) => {
      setText((prev) => (prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()));
    },
  });

  const previews = React.useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );
  React.useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...picked].slice(0, 10));
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const lines = splitTasks(text);
  const taskCount = lines.length;

  const submit = async () => {
    if (taskCount === 0 || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      // Images are attached to the first task only; subsequent tasks are text-only.
      await Promise.all(
        lines.map((prompt, idx) => {
          const form = new FormData();
          form.append('prompt', prompt);
          if (idx === 0) {
            for (const file of files) form.append('images', file, file.name);
          }
          return createTask(form);
        }),
      );
      setText('');
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setPhase('idle');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  const sendLabel =
    phase === 'submitting'
      ? 'Sending…'
      : taskCount > 1
        ? `Send ${taskCount}`
        : 'Send';

  return (
    <div
      className="gradient-border rounded-xl shadow-sm transition-[transform,box-shadow] duration-700 ease-out focus-within:shadow-lg motion-reduce:transition-none"
      style={{ transform: intro ? 'translateY(-42dvh)' : 'translateY(0)' }}
    >
      <div className="relative rounded-xl bg-card p-4">
      <div className="space-y-3">
        <Textarea
          value={text + (speech.interim ? ` ${speech.interim}` : '')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe a task — one per line. (⌘/Ctrl+Enter to submit)"
          rows={4}
          style={{ height: intro ? 50 : 100 }}
          className="min-h-0 resize-none border-0 bg-transparent p-0 text-base transition-[height] duration-700 ease-out focus-visible:ring-0 motion-reduce:transition-none"
        />

        {speech.interim && (
          <div className="text-sm italic text-muted-foreground">{speech.interim}</div>
        )}

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((p, idx) => (
              <div key={p.url} className="group relative">
                <img
                  src={p.url}
                  alt={p.name}
                  className="h-16 w-16 rounded border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 opacity-0 shadow ring-1 ring-border transition group-hover:opacity-100"
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            {speech.supported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={speech.listening ? speech.stop : speech.start}
                aria-label={speech.listening ? 'Stop dictation' : 'Start dictation'}
                className={cn(speech.listening && 'text-destructive')}
              >
                {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            {taskCount > 1 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {taskCount} tasks
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={taskCount === 0 || phase === 'submitting'}
            size="sm"
          >
            <Send className="h-4 w-4" />
            {sendLabel}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      </div>
    </div>
  );
}
