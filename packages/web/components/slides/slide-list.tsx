'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Slide } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { FormatBadge } from '@/components/slides/format-badge';
import { cn } from '@/lib/utils';

type Props = {
  slides: Slide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

/** Short one-line label for a slide, derived from its first non-empty content line. */
function slideTitle(slide: Slide): string {
  const line = slide.content
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').replace(/<[^>]+>/g, '').trim())
    .find((l) => l.length > 0);
  return line || 'Untitled slide';
}

function SlideRow({
  slide,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  slide: Slide;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1.5',
        selected && 'border-primary/50 bg-accent/40',
        isDragging && 'z-10 opacity-80 shadow-md',
      )}
    >
      <button
        type="button"
        aria-label="Reorder slide"
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(slide.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
        <FormatBadge format={slide.format} />
        <span className="truncate text-sm">{slideTitle(slide)}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Delete slide"
        onClick={() => onDelete(slide.id)}
        className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

export function SlideList({ slides, selectedId, onSelect, onReorder, onAdd, onDelete }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Slides ({slides.length})
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 px-2">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {slides.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
          No slides yet — add one to begin.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5">
              {slides.map((slide, index) => (
                <SlideRow
                  key={slide.id}
                  slide={slide}
                  index={index}
                  selected={slide.id === selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
