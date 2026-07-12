'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Link2, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '@midnite/shared';
import type { DeckSummary } from '@/lib/slides/store';
import { getDeckBySlug, deleteDeck, duplicateDeck } from '@/lib/slides/store';
import { renderStandaloneDeck } from '@/lib/slides/standalone-deck';
import { useConfirm } from '@/components/confirm-dialog';
import { ProjectTag } from '@/components/project-tag';
import { useToast } from '@/components/toast';
import { cn, relativeTime } from '@/lib/utils';

type DeckProject = Pick<Project, 'tag' | 'color'>;

const DOT_CAP = 14;

function Dots({ count }: { count: number }) {
  const n = Math.max(0, Math.min(count, DOT_CAP));
  return (
    <span className="flex flex-wrap items-center gap-[5px]">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="h-[6px] w-[6px] rounded-full bg-primary/50 transition-opacity group-hover:bg-primary/70" />
      ))}
      {count > DOT_CAP && (
        <span className="font-mono text-[0.72rem] text-muted-foreground">+{count - DOT_CAP}</span>
      )}
    </span>
  );
}

const badge = (id: number) => String(id).padStart(2, '0');
const plural = (n: number) => (n === 1 ? 'slide' : 'slides');
const iconBtn =
  'relative z-[2] grid h-8 w-8 place-items-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function CardActions({ deck, onChanged }: { deck: DeckSummary; onChanged: () => void }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const href = `/slides/present?slug=${encodeURIComponent(deck.slug)}`;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  function download(e: React.MouseEvent) {
    stop(e);
    const detail = getDeckBySlug(deck.slug);
    if (!detail) return;
    const html = renderStandaloneDeck(detail.title, detail.slides);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copyLink(e: React.MouseEvent) {
    stop(e);
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(`${window.location.origin}${href}`)
      .then(() => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1400);
      })
      .catch(() => {});
  }

  function duplicate(e: React.MouseEvent) {
    stop(e);
    duplicateDeck(deck.slug);
    toast.success('Deck duplicated');
    onChanged();
  }

  async function remove(e: React.MouseEvent) {
    stop(e);
    const ok = await confirm({
      title: `Delete “${deck.title}”?`,
      description: 'This permanently deletes the deck and all its slides. This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    deleteDeck(deck.slug);
    toast.success('Deck deleted');
    onChanged();
  }

  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={`/slides/edit?slug=${encodeURIComponent(deck.slug)}`}
        className={iconBtn}
        aria-label={`Edit “${deck.title}”`}
        title="Edit deck"
        onClick={(e) => e.stopPropagation()}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button type="button" className={iconBtn} onClick={duplicate} aria-label={`Duplicate “${deck.title}”`} title="Duplicate deck">
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(iconBtn, linkCopied && 'text-primary')}
        onClick={copyLink}
        aria-label={`Copy link to “${deck.title}”`}
        title={linkCopied ? 'Link copied' : 'Copy deck link'}
      >
        {linkCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
      <button type="button" className={iconBtn} onClick={download} aria-label={`Download “${deck.title}” as an offline HTML file`} title="Download offline copy (.html)">
        <Download className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(iconBtn, 'hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive')}
        onClick={remove}
        aria-label={`Delete “${deck.title}”`}
        title="Delete deck"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DeckCard({
  deck,
  project,
  onChanged,
}: {
  deck: DeckSummary;
  project?: DeckProject;
  onChanged: () => void;
}) {
  const href = `/slides/present?slug=${encodeURIComponent(deck.slug)}`;
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40">
      <Link href={href} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Present ${deck.title}`} />
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold tracking-wider text-primary">{badge(deck.id)}</span>
        <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <CardActions deck={deck} onChanged={onChanged} />
        </div>
      </div>
      <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground">{deck.title}</h3>
      <Dots count={deck.count} />
      <div className="flex items-center gap-2">
        <p className="text-xs tabular-nums text-muted-foreground">
          {deck.count} {plural(deck.count)} · {relativeTime(deck.updated)}
        </p>
        {project ? <ProjectTag tag={project.tag} color={project.color} /> : null}
      </div>
    </div>
  );
}

export function DeckRow({
  deck,
  project,
  onChanged,
}: {
  deck: DeckSummary;
  project?: DeckProject;
  onChanged: () => void;
}) {
  const href = `/slides/present?slug=${encodeURIComponent(deck.slug)}`;
  return (
    <div className="group relative flex items-center gap-4 rounded-lg border border-border/60 bg-card/40 px-4 py-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/40">
      <Link href={href} className="absolute inset-0 z-[1] rounded-lg" aria-label={`Present ${deck.title}`} />
      <span className="w-8 shrink-0 font-mono text-xs font-semibold tracking-wider text-primary">{badge(deck.id)}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{deck.title}</span>
      {project ? (
        <span className="relative z-[2] hidden shrink-0 sm:block">
          <ProjectTag tag={project.tag} color={project.color} />
        </span>
      ) : null}
      <span className="hidden shrink-0 sm:block">
        <Dots count={deck.count} />
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {deck.count} {plural(deck.count)}
      </span>
      <span className="hidden w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
        {relativeTime(deck.updated)}
      </span>
      <span className="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <CardActions deck={deck} onChanged={onChanged} />
      </span>
    </div>
  );
}
