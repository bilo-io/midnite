'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Mic,
  MicOff,
  Paperclip,
  X,
} from 'lucide-react';
import type { Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProjectSelect } from '@/components/project-select';
import { cn } from '@/lib/utils';
import { pingAgent } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useAutoResizeTextarea } from '@/lib/use-auto-resize-textarea';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { useFeatureDrafts, draftTasks } from '@/lib/feature-drafts';
import { FeatureListPills } from '@/components/feature-list-pills';
import { FeatureListModal } from '@/components/feature-list-modal';
import {
  ComposerFullscreen,
  ComposerFullscreenToggle,
  useComposerFullscreen,
} from '@/components/composer-fullscreen';

export function PromptComposer({ projects = [] }: { projects?: Project[] }) {
  const [text, setText] = React.useState('');
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [pinging, setPinging] = React.useState(false);
  const [pingResult, setPingResult] = React.useState<{ ok: boolean; text: string } | null>(null);
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

  const { full, toggle, close } = useComposerFullscreen();

  // Height: roomy & modal-sized in full screen; otherwise pinned small during the
  // intro glide, then compact-when-idle that opens up on focus and grows with
  // content up to a cap.
  const displayText = text + (speech.interim ? ` ${speech.interim}` : '');
  const ta = useAutoResizeTextarea(
    displayText,
    full
      ? { collapsed: 360, expanded: 360, max: 520 }
      : intro
        ? { collapsed: 50, expanded: 50, max: 50 }
        : { collapsed: 48, expanded: 96, max: 220 },
  );

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
    // Carry the chosen project onto the draft so the modal hands it to each
    // crafted task. Images ride along in-memory for this session only.
    const draft = drafts.add(text, undefined, projectId);
    if (files.length > 0) imagesByDraft.current.set(draft.id, files);
    setText('');
    setFiles([]);
  };

  const ping = async () => {
    if (pinging) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await pingAgent();
      setPingResult({ ok: res.ok, text: res.model ? `${res.model} — ${res.reply}` : res.reply });
    } catch (err) {
      setPingResult({ ok: false, text: err instanceof Error ? err.message : 'Ping failed' });
    } finally {
      setPinging(false);
    }
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
    invalidateData();
  };

  return (
    <>
    {!intro && (
      <FeatureListPills drafts={drafts.drafts} onOpen={(id) => setOpenId(id)} />
    )}
    {pingResult && (
      <ComposerStatusPanel
        tone={pingResult.ok ? 'success' : 'error'}
        message={pingResult.text}
        onDismiss={() => setPingResult(null)}
      />
    )}
    <ComposerFullscreen full={full} onClose={close}>
    <div
      className="gradient-border relative z-10 rounded-xl shadow-sm transition-[transform,box-shadow] duration-700 ease-out focus-within:shadow-lg motion-reduce:transition-none"
      style={{ transform: intro ? 'translateY(-42dvh)' : 'translateY(0)' }}
    >
      <div className="relative rounded-xl bg-card p-4">
      <ComposerFullscreenToggle full={full} onToggle={toggle} />
      <div className="space-y-3">
        <Textarea
          ref={ta.ref}
          value={displayText}
          onChange={(e) => setText(e.target.value)}
          onFocus={ta.onFocus}
          onBlur={ta.onBlur}
          onKeyDown={onKeyDown}
          placeholder="Add tasks, one per line · ⌘/Ctrl + ⏎"
          rows={1}
          className="min-h-0 resize-none overflow-y-auto border-0 bg-transparent p-0 pr-8 text-base transition-[height] duration-300 ease-in-out focus-visible:ring-0 motion-reduce:transition-none"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
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
              {projects.length > 0 && (
                <ProjectSelect
                  projects={projects}
                  value={projectId}
                  onChange={setProjectId}
                  placeholder="No project"
                  direction="up"
                  className="ml-1 min-w-0 cascade-item"
                />
              )}
              {taskCount > 1 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {taskCount} tasks
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void ping()}
                disabled={pinging}
                aria-label="Ping the AI"
                title="Check the AI is reachable"
                className="cascade-item"
                style={{ animationDelay: '160ms' }}
              >
                <Activity className={cn('h-4 w-4', pinging && 'animate-pulse')} />
                {pinging ? 'Pinging…' : 'Ping'}
              </Button>
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
          </div>
        )}

      </div>
      </div>
    </div>
    </ComposerFullscreen>

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

// Errors thrown by the API client read like `500 Internal Server Error: {json}`.
// Split the human-readable head from any JSON tail so the panel can show a
// one-line summary collapsed and the pretty-printed body when expanded.
function parseComposerError(raw: string): { title: string; body: string | null } {
  const braceIdx = raw.search(/[[{]/);
  if (braceIdx > -1) {
    const head = raw.slice(0, braceIdx).replace(/[:\s]+$/, '').trim();
    try {
      const parsed = JSON.parse(raw.slice(braceIdx));
      return { title: head || 'Request failed', body: JSON.stringify(parsed, null, 2) };
    } catch {
      // Tail wasn't valid JSON — fall through to the plain split below.
    }
  }
  const sep = raw.indexOf(': ');
  if (sep > -1) {
    const body = raw.slice(sep + 2).trim();
    return { title: raw.slice(0, sep).trim(), body: body || null };
  }
  return { title: raw, body: null };
}

type PanelTone = 'error' | 'success';

// Full literal class strings per tone — Tailwind can't see interpolated names,
// so the colour tokens must appear verbatim.
const PANEL_TONES: Record<
  PanelTone,
  { border: string; tint: string; fg: string; btn: string; pre: string }
> = {
  error: {
    border: 'border-destructive/40',
    tint: 'bg-destructive/15',
    fg: 'text-destructive',
    btn: 'text-destructive/70 hover:text-destructive',
    pre: 'bg-destructive/10 text-destructive',
  },
  success: {
    border: 'border-success/40',
    tint: 'bg-success/15',
    fg: 'text-success',
    btn: 'text-success/70 hover:text-success',
    pre: 'bg-success/10 text-success',
  },
};

// A stacked status card that peeks out from behind the composer's top edge
// (negative bottom margin + lower z-index). Dismissable, and — for errors with
// a JSON body — expandable to the pretty-printed payload. The composer's
// textarea never resizes. Errors are red; successful pings are green.
function ComposerStatusPanel({
  tone,
  message,
  onDismiss,
}: {
  tone: PanelTone;
  message: string;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  // The exit animation drives the actual unmount: clicking dismiss plays
  // `animate-error-out`, and onAnimationEnd then calls the parent's onDismiss.
  const [closing, setClosing] = React.useState(false);
  // Only errors carry a structured body worth pretty-printing; a success ping
  // is a single status line, shown whole.
  const { title, body } = React.useMemo(
    () => (tone === 'error' ? parseComposerError(message) : { title: message, body: null }),
    [tone, message],
  );
  const styles = PANEL_TONES[tone];
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'relative z-0 -mb-3 overflow-hidden rounded-t-xl border border-b-0 bg-card pb-3 shadow-sm',
        styles.border,
        closing ? 'animate-error-out' : 'animate-error-in',
      )}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onDismiss();
      }}
    >
      <div aria-hidden className={cn('pointer-events-none absolute inset-0', styles.tint)} />
      <div className="relative flex items-center gap-2 px-3 py-2">
        <Icon aria-hidden className={cn('h-4 w-4 shrink-0', styles.fg)} />
        <p className={cn('min-w-0 flex-1 truncate text-sm font-medium', styles.fg)} title={title}>
          {title}
        </p>
        {body ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className={cn('rounded p-0.5 transition-colors', styles.btn)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setClosing(true)}
          aria-label="Dismiss"
          className={cn('rounded p-0.5 transition-colors', styles.btn)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {body ? (
        <div
          className={cn(
            'relative grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <pre
              className={cn(
                'mx-3 mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded px-2.5 py-2 font-mono text-xs leading-relaxed',
                styles.pre,
              )}
            >
              {body}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
