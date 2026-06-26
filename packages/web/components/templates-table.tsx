'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, FileText, Trash2 } from 'lucide-react';
import { ProjectTag } from '@/components/project-tag';
import { MarkdownEditor } from '@/components/markdown-editor';
import { TagColorPicker } from '@/components/tag-color-picker';
import { cn } from '@/lib/utils';
import type { Template } from '@/app/(main)/projects/templates';

type Props = {
  templates: Template[];
  onUpdate: (id: string, patch: Partial<Template>) => void;
  onDelete: (id: string) => void;
  /** When this id changes, that template's row is expanded (e.g. a just-created one). */
  expandId?: string | null;
};

/**
 * Table layout for templates: each document is a collapsible accordion. The
 * header carries the tag chip and an inline-editable title; the expanded body
 * holds a description field and an editable view of the markdown document.
 */
export function TemplatesTable({ templates, onUpdate, onDelete, expandId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    expandId ? new Set([expandId]) : new Set(),
  );

  useEffect(() => {
    if (expandId) setExpanded((prev) => new Set(prev).add(expandId));
  }, [expandId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      {templates.map((t) => {
        const open = expanded.has(t.id);
        return (
          <section
            key={t.id}
            className="overflow-hidden rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-expanded={open}
                aria-label={open ? `Collapse ${t.name}` : `Expand ${t.name}`}
                className="flex shrink-0 items-center gap-2 rounded py-1 pl-1 text-left"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    !open && '-rotate-90',
                  )}
                />
                <ProjectTag tag={t.tag} color={t.color} />
              </button>
              <input
                value={t.name}
                onChange={(e) => onUpdate(t.id, { name: e.target.value })}
                aria-label="Template title"
                placeholder="Untitled template"
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium outline-none transition-colors hover:border-border/60 focus:border-foreground/20 focus:bg-background"
              />
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                aria-label={`Delete ${t.name}`}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {open ? (
              <div className="space-y-3 border-t border-border/60 px-3 py-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <input
                    value={t.description}
                    onChange={(e) => onUpdate(t.id, { description: e.target.value })}
                    placeholder="What this template is for…"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </label>
                <TagColorPicker
                  tag={t.tag}
                  color={t.color}
                  onTagChange={(v) => onUpdate(t.id, { tag: v })}
                  onColorChange={(v) => onUpdate(t.id, { color: v })}
                  label={
                    <span className="text-xs font-medium text-muted-foreground">
                      Tag &amp; color
                    </span>
                  }
                />
                <MarkdownEditor
                  value={t.content}
                  onChange={(v) => onUpdate(t.id, { content: v })}
                  label={
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Document
                    </span>
                  }
                />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
