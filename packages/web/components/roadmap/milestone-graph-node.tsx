'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { statusHueVar } from '@/components/task-columns';
import { ProjectProgressBar } from '@/components/project-progress';
import {
  MILESTONE_GRAPH_NODE_WIDTH,
  milestoneNodeHeight,
  type MilestoneGraphNodeData,
} from '@/lib/milestone-graph-layout';
import { cn } from '@/lib/utils';

/** Callbacks the view wires onto each node's `data` after `layoutMilestoneGraph`
 *  (a pure function that only knows geometry, not interaction). */
export type MilestoneGraphNodeCallbacks = {
  expanded: boolean;
  onToggleExpand: () => void;
  onRename: (name: string) => void;
  onSelectTask: (taskId: string) => void;
  onUnassignTask: (taskId: string) => void;
  onAddTask: (title: string) => void;
};

type NodeData = MilestoneGraphNodeData & MilestoneGraphNodeCallbacks;

/**
 * One milestone in the dependency graph. Collapsed: name (click to rename) +
 * progress. Clicking the card body (not the rename input, not a task row)
 * expands it to show its tasks, each removable, plus a quick "add task" input.
 * Connect handles are real (mirroring the task graph's) so dragging between two
 * nodes edits the "blocked by" edge — deleting a selected edge (Delete/Backspace)
 * removes it.
 */
export function MilestoneGraphNode({ data }: NodeProps) {
  const t = useTranslations('board');
  const node = data as unknown as NodeData;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [adding, setAdding] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(node.name), [node.name]);
  useEffect(() => {
    if (editing) nameInputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== node.name) node.onRename(next);
    else setDraft(node.name);
  };

  const commitAdd = () => {
    const title = adding.trim();
    setAdding('');
    if (title) node.onAddTask(title);
  };

  const height = milestoneNodeHeight(node, node.expanded);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/90 shadow-sm"
      style={{ width: MILESTONE_GRAPH_NODE_WIDTH, height }}
      onClick={(e) => {
        // Ignore clicks on the rename input, task rows, or the add-task input —
        // only the card's own chrome toggles expand/collapse.
        if ((e.target as HTMLElement).closest('[data-no-expand]')) return;
        node.onToggleExpand();
      }}
    >
      <Handle type="target" position={Position.Left} onClick={(e) => e.stopPropagation()} />
      <div className="flex items-center gap-1.5 border-b border-border/60 p-2" data-no-expand>
        {editing ? (
          <input
            ref={nameInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(node.name);
                setEditing(false);
              }
            }}
            aria-label={`Rename ${node.name}`}
            className="h-6 min-w-0 flex-1 rounded border border-border bg-background px-1.5 text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:underline"
          >
            {node.name}
          </button>
        )}
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {node.total}
        </span>
      </div>

      <div className="px-2 pt-1.5">
        <ProjectProgressBar done={node.done} total={node.total} hideLabel />
      </div>

      {node.expanded ? (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2" data-no-expand>
          {node.tasks.map((task) => {
            const hue = statusHueVar(task.status);
            return (
              <div
                key={task.id}
                className="group flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-accent"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `hsl(${hue.startsWith('--') ? `var(${hue})` : hue})` }}
                  aria-hidden
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => node.onSelectTask(task.id)}
                >
                  {task.title}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${task.title} from ${node.name}`}
                  className={cn(
                    'shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100',
                    'focus-visible:opacity-100',
                  )}
                  onClick={() => node.onUnassignTask(task.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {node.tasks.length === 0 ? (
            <p className="py-1 text-center text-[11px] text-muted-foreground">{t('roadmapGraph.noTasks')}</p>
          ) : null}
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') setAdding('');
            }}
            placeholder="+ Add task…"
            aria-label={`Add task to ${node.name}`}
            className="mt-0.5 w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted-foreground outline-none focus:border-border focus:bg-background"
          />
        </div>
      ) : null}

      <Handle type="source" position={Position.Right} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
