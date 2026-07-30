'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { TaskSummary } from '@midnite/shared';
import { useTranslations } from 'next-intl';
import { TaskRow } from '@/components/task-row';
import type { ProjectTagInfo } from '@/components/task-card';
import { cn } from '@/lib/utils';

/**
 * A {@link TaskRow} that can be dragged into another status section — the list and
 * table views' counterpart to dragging a card between board columns.
 *
 * Registers with the enclosing `SortableAccordions` `DndContext` (the innermost
 * provider around these rows), which reports the drop through its `onItemDrop`
 * hatch. Dragging is deliberately confined to an explicit **grip**, mirroring the
 * accordion headers' own handle, for two reasons: the row's body is a `<button>`
 * that opens the task, so a whole-row drag would race its click; and dnd-kit's
 * `attributes` put `role="button"` on whatever they're spread onto, which around
 * the row would nest interactive controls (an axe `nested-interactive` failure).
 * On the grip — a real `<button>`, sibling to the row's own — both problems vanish.
 */
export function DraggableTaskRow({
  task,
  project,
  onSelect,
  selected,
  onToggleSelect,
  blockedBy,
}: {
  task: TaskSummary;
  project?: ProjectTagInfo;
  onSelect?: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
  blockedBy?: number;
}) {
  const t = useTranslations('board');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      // Translate only — a row must not pick up the sortable's scale/transition.
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && 'relative z-20 opacity-80')}
    >
      <TaskRow
        task={task}
        project={project}
        onSelect={onSelect}
        selected={selected}
        onToggleSelect={onToggleSelect}
        blockedBy={blockedBy}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t('dragTask', { title: task.title })}
            className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
