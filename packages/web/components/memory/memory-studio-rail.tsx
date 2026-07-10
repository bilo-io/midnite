'use client';

import { AudioLines, FileText, HelpCircle, Image, ListOrdered, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// The NotebookLM-style artifacts the Studio generates from a memory's corpus.
// Text + infographic land in Theme D; audio + video in Theme E. Rendered here
// as a preview of the shape, disabled until their themes wire generation.
const ARTIFACTS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'brief', label: 'Executive brief', Icon: FileText },
  { key: 'faq', label: 'FAQ', Icon: HelpCircle },
  { key: 'study-guide', label: 'Study guide', Icon: ListOrdered },
  { key: 'infographic', label: 'Infographic', Icon: Image },
  { key: 'audio', label: 'Audio overview', Icon: AudioLines },
  { key: 'video', label: 'Video', Icon: Video },
];

/**
 * The right "Studio" rail (Phase 65 A scaffold): the artifact menu, greyed and
 * disabled, so the three-panel workspace shows its full intent. Generation is
 * wired in Themes D (text + infographic) and E (audio + video).
 */
export function MemoryStudioRail() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Generate artifacts from this memory and its sources.
      </p>
      <ul className="space-y-1.5">
        {ARTIFACTS.map(({ key, label, Icon }) => (
          <li key={key}>
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-left text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
              <span className="flex-1">{label}</span>
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                Soon
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
