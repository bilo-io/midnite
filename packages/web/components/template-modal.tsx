'use client';

import { useState } from 'react';
import { Check, Copy, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/markdown-editor';
import { ProjectTag } from '@/components/project-tag';
import { TagColorPicker } from '@/components/tag-color-picker';
import type { Template } from '@/app/(main)/projects/templates';

type Props = {
  template: Template;
  onSave: (patch: Partial<Template>) => void;
  onDelete: () => void;
  onClose: () => void;
};

/**
 * Opens a template for editing: its title, description, and the markdown
 * document. Changes are saved back to the (locally persisted) template, and the
 * document can be copied out to seed a project plan.
 */
export function TemplateModal({ template, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [tag, setTag] = useState(template.tag);
  const [color, setColor] = useState(template.color);
  const [content, setContent] = useState(template.content);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== template.name ||
    description !== template.description ||
    tag !== template.tag ||
    color !== template.color ||
    content !== template.content;

  const save = () => {
    onSave({ name, description, tag, color, content });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context, permissions) — no-op.
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${template.name} template`}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <ProjectTag tag={tag.trim() || 'tag'} color={color} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Template title"
              placeholder="Untitled template"
              className="h-8 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border/60 focus-visible:border-foreground/20"
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this template is for…"
              />
            </label>
            <TagColorPicker
              tag={tag}
              color={color}
              onTagChange={setTag}
              onColorChange={setColor}
              label={
                <span className="text-xs font-medium text-muted-foreground">Tag &amp; color</span>
              }
            />
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight={320}
              label={<span className="text-xs font-medium text-muted-foreground">Document</span>}
            />
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy markdown'}
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={!dirty && !saved}>
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
