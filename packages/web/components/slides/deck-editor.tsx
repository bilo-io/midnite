'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { Deck, DeckContent, DeckTheme, Slide, SlideFormat } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { SlideList } from '@/components/slides/slide-list';
import { RevealPreview } from '@/components/slides/reveal-preview';
import { DeckThemeControls } from '@/components/slides/deck-theme-controls';
import { createDeck, updateDeck } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { newSlide, moveItem, contentEquals } from '@/lib/deck-content';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { cn } from '@/lib/utils';

type Props = {
  /** Present for edit mode; absent for a fresh /slides/new deck. */
  initial?: Deck;
};

const FORMAT_OPTIONS: Array<{ value: SlideFormat; label: string }> = [
  { value: 'md', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
];

export function DeckEditor({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const autosaveSeconds = settings.editorAutosaveSeconds ?? DEFAULT_SETTINGS.editorAutosaveSeconds;

  const [deckId, setDeckId] = useState<string | null>(initial?.id ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const initialSlides = initial?.content.slides ?? [];
  const [slides, setSlides] = useState<Slide[]>(
    initialSlides.length > 0 ? initialSlides : [newSlide('md')],
  );
  const [theme, setTheme] = useState<DeckTheme | undefined>(initial?.content.theme);
  const [selectedId, setSelectedId] = useState<string | null>(slides[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  // Last-persisted snapshot for dirty tracking. A never-saved deck starts dirty.
  const [snapshot, setSnapshot] = useState<{ name: string; description: string; content: DeckContent } | null>(
    initial ? { name: initial.name, description: initial.description ?? '', content: initial.content } : null,
  );

  const content: DeckContent = useMemo(() => ({ slides, theme }), [slides, theme]);
  const dirty = useMemo(() => {
    if (!snapshot) return true;
    return (
      snapshot.name !== name ||
      snapshot.description !== description ||
      !contentEquals(snapshot.content, content)
    );
  }, [snapshot, name, description, content]);

  const canSave = name.trim().length > 0 && dirty && !saving;

  const selected = slides.find((s) => s.id === selectedId) ?? null;

  const patchSelected = useCallback(
    (patch: Partial<Slide>) => {
      if (!selectedId) return;
      setSlides((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
    },
    [selectedId],
  );

  const addSlide = useCallback(() => {
    const slide = newSlide(selected?.format ?? 'md');
    setSlides((prev) => [...prev, slide]);
    setSelectedId(slide.id);
  }, [selected]);

  const deleteSlide = useCallback(
    (id: string) => {
      setSlides((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        const next = prev.filter((s) => s.id !== id);
        if (id === selectedId) {
          const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
          setSelectedId(fallback?.id ?? null);
        }
        return next;
      });
    },
    [selectedId],
  );

  const reorder = useCallback((from: number, to: number) => {
    setSlides((prev) => moveItem(prev, from, to));
  }, []);

  // A ref-guarded save so the autosave timer always sees the latest closure.
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const save = useCallback(async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      content,
    };
    try {
      if (deckId) {
        await updateDeck(deckId, body);
      } else {
        const created = await createDeck(body);
        setDeckId(created.id);
        // Swap the create route for the deck's stable URL without a full reload.
        router.replace(`/slides/view?id=${created.id}`);
      }
      setSnapshot({ name: name.trim(), description: description.trim(), content });
      invalidateData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save deck');
    } finally {
      setSaving(false);
    }
  }, [name, description, content, deckId, saving, router, toast]);
  saveRef.current = save;

  // Debounced autosave: fire `autosaveSeconds` after the last edit while dirty.
  useEffect(() => {
    if (autosaveSeconds <= 0 || !dirty || !name.trim() || saving) return;
    const t = setTimeout(() => void saveRef.current(), autosaveSeconds * 1000);
    return () => clearTimeout(t);
  }, [autosaveSeconds, dirty, name, saving, content, description]);

  // Debounce the deck fed to the live preview so reveal isn't re-initialised on
  // every keystroke — only ~400ms after edits settle.
  const [previewSlides, setPreviewSlides] = useState<Slide[]>(slides);
  useEffect(() => {
    const t = setTimeout(() => setPreviewSlides(slides), 400);
    return () => clearTimeout(t);
  }, [slides]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/slides"
            aria-label="Back to decks"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            type="text"
            aria-label="Deck name"
            value={name}
            placeholder="Untitled deck"
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 border-b border-transparent bg-transparent text-lg font-semibold outline-none focus:border-border"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus dirty={dirty} saving={saving} saved={snapshot !== null} />
          <Button type="button" size="sm" disabled={!canSave} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>

      <input
        type="text"
        aria-label="Deck description"
        value={description}
        placeholder="Description (optional)"
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm outline-none focus:border-primary/60"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        {/* Left: slide list + per-slide editor + theme override */}
        <div className="space-y-4">
          <SlideList
            slides={slides}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={reorder}
            onAdd={addSlide}
            onDelete={deleteSlide}
          />
          <DeckThemeControls theme={theme} onChange={setTheme} />
        </div>

        {/* Right: editing surface for the selected slide + live preview */}
        <div className="space-y-3">
          <RevealPreview slides={previewSlides} theme={theme} />
          {selected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Format
                </span>
                <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
                  {FORMAT_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-pressed={selected.format === value}
                      onClick={() => patchSelected({ format: value })}
                      className={cn(
                        'h-7 px-2 text-xs',
                        selected.format === value && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <textarea
                aria-label="Slide content"
                value={selected.content}
                onChange={(e) => patchSelected({ content: e.target.value })}
                spellCheck={false}
                className="h-56 w-full resize-y rounded border border-border/60 bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary/60"
                placeholder={
                  selected.format === 'md' ? '# Slide title\n\nMarkdown body…' : '<h1>Slide title</h1>'
                }
              />
              <textarea
                aria-label="Speaker notes"
                value={selected.notes ?? ''}
                onChange={(e) => patchSelected({ notes: e.target.value || undefined })}
                spellCheck={false}
                className="h-20 w-full resize-y rounded border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                placeholder="Speaker notes (optional)"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select or add a slide to edit it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ dirty, saving, saved }: { dirty: boolean; saving: boolean; saved: boolean }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (dirty) {
    return <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>;
  }
  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }
  return null;
}
