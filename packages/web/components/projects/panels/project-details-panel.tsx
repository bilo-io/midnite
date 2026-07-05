'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, ChevronRight, FolderOpen, Loader2, Sparkles, X } from 'lucide-react';
import { MAX_TAG_LENGTH, type Memory, type Project, type Repo } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderPicker } from '@/components/folder-picker';
import { DEFAULT_COLOR, TagColorPicker } from '@/components/tag-color-picker';
import { IdeaSourceBadge } from '@/components/projects/IdeaSourceBadge';
import { enhanceProjectDescription, getRepos, updateProject } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  project: Project;
  memories?: Memory[];
  /** Called after a successful save so the parent can re-hydrate the project. */
  onSaved: () => void;
  /** Called after navigating away (e.g. to memory) — the modal passes its onClose. */
  onAfterNavigate?: () => void;
};

/**
 * A project's core details (Phase 55 B) — self-saving edit form shared by the
 * modal (edit mode) and the detail page. Owns its own draft state + Save button;
 * create-mode's form stays inline in the modal.
 */
export function ProjectDetailsPanel({ project, memories = [], onSaved, onAfterNavigate }: Props) {
  const router = useRouter();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [tag, setTag] = useState(project.tag ?? '');
  const [color, setColor] = useState(project.color ?? DEFAULT_COLOR);
  const [workDir, setWorkDir] = useState(project.workDir ?? '');
  const [phaseDocSync, setPhaseDocSync] = useState(project.phaseDocSync !== false);
  const [phaseDocSyncRepoId, setPhaseDocSyncRepoId] = useState(project.phaseDocSyncRepoId ?? '');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [picking, setPicking] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync the draft only when the project identity changes (not on reload of
  // the same project after a save, which would clobber in-flight edits).
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
    setTag(project.tag ?? '');
    setColor(project.color ?? DEFAULT_COLOR);
    setWorkDir(project.workDir ?? '');
    setPhaseDocSync(project.phaseDocSync !== false);
    setPhaseDocSyncRepoId(project.phaseDocSyncRepoId ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key on identity, not every field
  }, [project.id]);

  useEffect(() => {
    getRepos()
      .then(setRepos)
      .catch(() => setRepos([]));
  }, []);

  const projectMemories = memories.filter((m) => m.projectId === project.id);
  const tagTooLong = tag.trim().length > MAX_TAG_LENGTH;
  const canSave = name.trim().length > 0 && tag.trim().length > 0 && !tagTooLong;

  const enhance = async () => {
    if (!description.trim()) {
      setError('Write a short description first, then improve it with AI');
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      setDescription(await enhanceProjectDescription({ name: name.trim() || undefined, description }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        tag: tag.trim(),
        color,
        workDir: workDir.trim(),
        phaseDocSync,
        phaseDocSyncRepoId,
      });
      onSaved();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {project.ideaId && (
        <div>
          <IdeaSourceBadge ideaId={project.ideaId} />
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
          Title
        </label>
        <input
          id="project-name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Billing revamp"
        />
      </div>

      {/* Description + AI */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="project-description" className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={enhance}
            disabled={aiLoading}
            aria-label="Improve with AI"
            className="h-7 gap-1.5 text-xs"
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Improve with AI
          </Button>
        </div>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={4}
        />
      </div>

      {/* Tag + color */}
      <div className="space-y-1.5">
        <TagColorPicker
          tag={tag}
          color={color}
          onTagChange={setTag}
          onColorChange={setColor}
          tagInputId="project-tag"
          label={
            <label htmlFor="project-tag" className="text-xs font-medium text-muted-foreground">
              Tag &amp; color
            </label>
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Max {MAX_TAG_LENGTH} characters. Tasks in this project carry this tag.
        </p>
      </div>

      {/* Work directory */}
      <div className="space-y-1.5">
        <label htmlFor="project-workdir" className="text-xs font-medium text-muted-foreground">
          Work directory
        </label>
        <div className="flex items-center gap-2">
          <input
            id="project-workdir"
            className={cn(inputClass, 'flex-1 font-mono text-xs')}
            value={workDir}
            onChange={(e) => setWorkDir(e.target.value)}
            placeholder="~/Dev/my-project"
            spellCheck={false}
          />
          {workDir.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear work directory"
              onClick={() => setWorkDir('')}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setPicking(true)}
          >
            <FolderOpen className="h-4 w-4" />
            Browse
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Where this project&apos;s agent sessions spawn. Leave blank to use the default.
        </p>
      </div>

      {/* Project memory */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Project memory</span>
        <button
          type="button"
          onClick={() => {
            router.push(
              projectMemories.length
                ? `/memory?scope=${encodeURIComponent(project.id)}`
                : `/memory?create=${encodeURIComponent(project.id)}`,
            );
            onAfterNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent/40"
        >
          <Brain className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
          <span className="min-w-0 flex-1 truncate">
            {projectMemories.length
              ? `View ${projectMemories.length} memor${projectMemories.length === 1 ? 'y' : 'ies'}`
              : 'Create a memory for this project'}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <p className="text-[11px] text-muted-foreground">
          Knowledge entries scoped to this project, injected into agent prompts.
        </p>
      </div>

      {/* Phase-doc sync */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Phase doc sync</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={phaseDocSync}
            onChange={(e) => setPhaseDocSync(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span>Tick phase-doc checkboxes as seeded tasks complete</span>
        </label>
        <select
          aria-label="Phase doc sync repo"
          className={inputClass}
          value={phaseDocSyncRepoId}
          disabled={!phaseDocSync}
          onChange={(e) => setPhaseDocSyncRepoId(e.target.value)}
        >
          <option value="">Select a repo…</option>
          {repos
            .filter((r) => r.ownerRepo)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.ownerRepo})
              </option>
            ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          When a seeded task reaches <em>Done</em>, its checkbox is ticked in this repo&apos;s{' '}
          <code>.midnite/phases/*.md</code> (and un-ticked if reopened).
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => void save()} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      {picking ? (
        <FolderPicker
          initialPath={workDir.trim() || undefined}
          onSelect={setWorkDir}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
