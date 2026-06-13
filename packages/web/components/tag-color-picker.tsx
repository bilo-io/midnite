'use client';

import type { ReactNode } from 'react';

import { MAX_TAG_LENGTH } from '@midnite/shared';
import { Input } from '@/components/ui/input';
import { ProjectTag } from '@/components/project-tag';
import { cn } from '@/lib/utils';

export const SWATCHES = [
  '#6366f1',
  '#7c3aed',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#64748b',
];
export const DEFAULT_COLOR = '#6366f1';

type Props = {
  tag: string;
  color: string;
  onTagChange: (tag: string) => void;
  onColorChange: (color: string) => void;
  /** Rendered above the inputs (e.g. a field label). */
  label?: ReactNode;
  /** id for the tag input so an external `<label htmlFor>` can target it. */
  tagInputId?: string;
  /** Chip text shown in the preview while the tag is empty. */
  fallbackTag?: string;
};

/**
 * Tag + color editor: a short-tag input, a native color well, a live chip
 * preview, and a row of preset swatches. Shared by the project and template
 * forms.
 */
export function TagColorPicker({
  tag,
  color,
  onTagChange,
  onColorChange,
  label,
  tagInputId,
  fallbackTag = 'tag',
}: Props) {
  const tooLong = tag.trim().length > MAX_TAG_LENGTH;
  return (
    <div className="space-y-1.5">
      {label}
      <div className="flex items-center gap-2">
        <Input
          id={tagInputId}
          value={tag}
          maxLength={MAX_TAG_LENGTH}
          onChange={(e) => onTagChange(e.target.value)}
          placeholder="short-tag"
          aria-label={tagInputId ? undefined : 'Tag'}
          className={cn('flex-1', tooLong && 'border-destructive')}
        />
        <input
          type="color"
          aria-label="Tag color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <ProjectTag tag={tag.trim() || fallbackTag} color={color} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Use color ${s}`}
            onClick={() => onColorChange(s)}
            className={cn(
              'h-5 w-5 rounded-full border transition-transform hover:scale-110',
              color.toLowerCase() === s ? 'ring-2 ring-ring ring-offset-1 ring-offset-card' : '',
            )}
            style={{ backgroundColor: s }}
          />
        ))}
      </div>
    </div>
  );
}
