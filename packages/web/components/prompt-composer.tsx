'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ListPlus, Mic, MicOff, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { useFeatureDrafts, draftTasks } from '@/lib/feature-drafts';
import { FeatureListPills } from '@/components/feature-list-pills';
import { FeatureListModal } from '@/components/feature-list-modal';

export function PromptComposer() {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Parked feature-list requests live client-side until the user crafts them
  // into tasks from the modal. Images picked in the composer are carried per
  // draft in-memory only (this session) — text/name persist across reloads.
  const drafts = useFeatureDrafts();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const imagesByDraft = React.useRef<Map<string, File[]>>(new Map());

  const openDraft = openId ? drafts.drafts.find((d) => d.id === openId) ?? null : null;

  // Intro: start centered + compact, then settle to the bottom at full height.
  // Only once that settle transition (≈700ms) finishes do the bottom-left icon
  // buttons cascade in — until then the controls row is withheld so the compact
  // box stays under 6rem high.
  const [intro, setIntro] = React.useState(true);
  const [controlsIn, setControlsIn] = React.useState(false);
  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIntro(false);
      setControlsIn(true);
      return;
    }
    const settleId = setTimeout(() => setIntro(false), 450);
    // 450ms intro delay + 700ms height/transform transition.
    const controlsId = setTimeout(() => setControlsIn(true), 1150);
    return () => {
      clearTimeout(settleId);
      clearTimeout(controlsId);
    };
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

  const taskCount = draftTasks(text).length;

  // Pressing submit parks the prompt as a feature-list request (a pill) — it
  // does not craft tasks yet. That happens from the draft's modal.
  const submit = () => {
    if (taskCount === 0) return;
    setError(null);
    const draft = drafts.add(text);
    if (files.length > 0) imagesByDraft.current.set(draft.id, files);
    setText('');
    setFiles([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const closeModal = () => setOpenId(null);

  const deleteDraft = (id: string) => {
    imagesByDraft.current.delete(id);
    drafts.remove(id);
    closeModal();
  };

  const committedDraft = (id: string) => {
    imagesByDraft.current.delete(id);
    drafts.remove(id);
    closeModal();
    router.refresh();
  };

  return (
    <>
    {!intro && (
      <FeatureListPills drafts={drafts.drafts} onOpen={(id) => setOpenId(id)} />
    )}
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
          placeholder="Describe a feature list — one task per line. (⌘/Ctrl+Enter to add)"
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

        {controlsIn && (
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
                className="cascade-item"
                style={{ animationDelay: '0ms' }}
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
                  className={cn('cascade-item', speech.listening && 'text-destructive')}
                  style={{ animationDelay: '90ms' }}
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
              onClick={submit}
              disabled={taskCount === 0}
              size="sm"
              className="cascade-item"
              style={{ animationDelay: '180ms' }}
            >
              <ListPlus className="h-4 w-4" />
              {taskCount > 1 ? `Add ${taskCount}` : 'Add'}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      </div>
    </div>

    {openDraft && (
      <FeatureListModal
        draft={openDraft}
        images={imagesByDraft.current.get(openDraft.id)}
        onClose={closeModal}
        onChange={(patch) => drafts.update(openDraft.id, patch)}
        onDelete={() => deleteDraft(openDraft.id)}
        onCommitted={() => committedDraft(openDraft.id)}
      />
    )}
    </>
  );
}
