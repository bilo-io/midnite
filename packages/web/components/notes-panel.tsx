'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, EyeOff, Eye, Mic, MicOff, Trash2 } from 'lucide-react';
import type { Note } from '@midnite/shared';
import { createNote, deleteNote, updateNote } from '@/lib/api';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { cn } from '@/lib/utils';

const SETTLE_MS = 1150;

export function NotesPanel({ notes: initial }: { notes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initial);
  const [showCompleted, setShowCompleted] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      const content = text.trim();
      if (!content) return;
      // Auto-create the note immediately when speech finalises
      createNote({ content }).then((note) => setNotes((prev) => [...prev, note]));
    },
  });

  const visible = showCompleted ? notes : notes.filter((n) => !n.completed);

  const add = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    const note = await createNote({ content });
    setNotes((prev) => [...prev, note]);
  }, [draft]);

  const toggle = useCallback(async (note: Note) => {
    const updated = await updateNote(note.id, { completed: !note.completed });
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }, []);

  const remove = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNote(id);
  }, []);

  const startEdit = useCallback((note: Note) => {
    setEditingId(note.id);
    setEditingText(note.content);
  }, []);

  const commitEdit = useCallback(
    async (id: string) => {
      const content = editingText.trim();
      setEditingId(null);
      if (!content) return;
      const updated = await updateNote(id, { content });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    },
    [editingText],
  );

  const completedCount = notes.filter((n) => n.completed).length;

  return (
    <section
      className="cascade-item flex h-full flex-col rounded-xl border surface-glass shadow-sm"
      style={{ animationDelay: `${SETTLE_MS + 6 * 70}ms` }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Action items</span>
          {completedCount > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {completedCount} done
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={showCompleted ? 'Hide completed' : 'Show completed'}
        >
          {showCompleted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showCompleted ? 'Hide done' : 'Show done'}
        </button>
      </div>

      {/* List */}
      <ul className="min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto">
        {visible.map((note) => (
          <li key={note.id} className="group flex items-center gap-3 px-5 py-2.5">
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => toggle(note)}
              aria-label={note.completed ? 'Mark incomplete' : 'Mark complete'}
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                note.completed
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary',
              )}
            >
              {note.completed && <Check className="h-2.5 w-2.5" />}
            </button>

            {/* Text / edit input */}
            {editingId === note.id ? (
              <textarea
                autoFocus
                rows={2}
                className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-snug outline-none"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => commitEdit(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit(note.id);
                  }
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span
                role="button"
                tabIndex={0}
                onClick={() => startEdit(note)}
                onKeyDown={(e) => e.key === 'Enter' && startEdit(note)}
                className={cn(
                  'min-w-0 flex-1 cursor-text select-text text-sm leading-snug',
                  note.completed && 'text-muted-foreground line-through',
                )}
              >
                {note.content}
              </span>
            )}

            {/* Delete — only visible on hover */}
            <button
              type="button"
              onClick={() => remove(note.id)}
              aria-label="Delete note"
              className="ml-auto flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}

        {visible.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-muted-foreground">
            {notes.length === 0 ? 'No notes yet — add one below.' : 'No active notes.'}
          </li>
        )}
      </ul>

      {/* Add input */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border/40 px-5 py-3">
        <input
          ref={inputRef}
          value={speech.listening ? speech.interim || draft : draft}
          onChange={(e) => !speech.listening && setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={speech.listening ? 'Listening…' : 'Add a note…'}
          readOnly={speech.listening}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm outline-none',
            speech.listening
              ? 'placeholder:text-primary/60 text-muted-foreground italic'
              : 'placeholder:text-muted-foreground',
          )}
        />
        {speech.supported && (
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-label={speech.listening ? 'Stop dictation' : 'Dictate note'}
            className={cn(
              'flex-shrink-0 rounded-md p-1.5 transition-colors',
              speech.listening
                ? 'text-primary animate-pulse'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || speech.listening}
          className="flex-shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  );
}
