'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Brain, ChevronRight, FolderOpen, Loader2, Sparkles, X } from 'lucide-react';
import { MAX_TAG_LENGTH, type Memory, type Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderPicker } from '@/components/folder-picker';
import { ProjectRepoStatus } from '@/components/projects/project-repo-status';
import { DEFAULT_COLOR, TagColorPicker } from '@/components/tag-color-picker';
import { enhanceProjectDescription, updateProject } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

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
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [tag, setTag] = useState(project.tag ?? '');
  const [color, setColor] = useState(project.color ?? DEFAULT_COLOR);
  const [workDir, setWorkDir] = useState(project.workDir ?? '');
  const [startCommand, setStartCommand] = useState(project.startCommand ?? '');
  const [buildCommand, setBuildCommand] = useState(project.buildCommand ?? '');
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
    setStartCommand(project.startCommand ?? '');
    setBuildCommand(project.buildCommand ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key on identity, not every field
  }, [project.id]);

  const projectMemories = memories.filter((m) => m.projectId === project.id);
  const tagTooLong = tag.trim().length > MAX_TAG_LENGTH;
  const canSave = name.trim().length > 0 && tag.trim().length > 0 && !tagTooLong;

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  const enhance = async () => {
    if (!description.trim()) {
      setError(t('form.writeDescriptionFirst'));
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
        startCommand: startCommand.trim(),
        buildCommand: buildCommand.trim(),
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
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
          {t('form.title')}
        </label>
        <input
          id="project-name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.titlePlaceholder')}
        />
      </div>

      {/* Description + AI */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="project-description" className="text-xs font-medium text-muted-foreground">
            {t('form.description')}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={enhance}
            disabled={aiLoading}
            aria-label={t('form.improveWithAi')}
            className="h-7 gap-1.5 text-xs"
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t('form.improveWithAi')}
          </Button>
        </div>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
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
              {t('form.tagAndColour')}
            </label>
          }
        />
        <p className="text-[11px] text-muted-foreground">{t('form.tagHint', { max: MAX_TAG_LENGTH })}</p>
      </div>

      {/* Work directory */}
      <div className="space-y-1.5">
        <label htmlFor="project-workdir" className="text-xs font-medium text-muted-foreground">
          {t('form.workDir')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="project-workdir"
            className={cn(inputClass, 'flex-1 font-mono text-xs')}
            value={workDir}
            onChange={(e) => setWorkDir(e.target.value)}
            placeholder={t('form.workDirPlaceholder')}
            spellCheck={false}
          />
          {workDir.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('form.clearWorkDir')}
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
            {t('form.browse')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('form.workDirHint')}</p>
        <ProjectRepoStatus projectId={project.id} workDir={project.workDir} />
      </div>

      {/* Start / build commands */}
      <div className="space-y-1.5">
        <label htmlFor="project-start-command" className="text-xs font-medium text-muted-foreground">
          {t('form.startCommand')}
        </label>
        <input
          id="project-start-command"
          className={cn(inputClass, 'font-mono text-xs')}
          value={startCommand}
          onChange={(e) => setStartCommand(e.target.value)}
          placeholder={t('form.startCommandPlaceholder')}
          spellCheck={false}
        />
        <p className="text-[11px] text-muted-foreground">
          {t.rich('form.startCommandHint', {
            b: (chunks) => <strong className="font-medium">{chunks}</strong>,
          })}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="project-build-command" className="text-xs font-medium text-muted-foreground">
          {t('form.buildCommand')}
        </label>
        <input
          id="project-build-command"
          className={cn(inputClass, 'font-mono text-xs')}
          value={buildCommand}
          onChange={(e) => setBuildCommand(e.target.value)}
          placeholder={t('form.buildCommandPlaceholder')}
          spellCheck={false}
        />
        <p className="text-[11px] text-muted-foreground">
          {t.rich('form.buildCommandHint', {
            b: (chunks) => <strong className="font-medium">{chunks}</strong>,
          })}
        </p>
      </div>

      {/* Project memory */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('form.projectMemory')}</span>
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
              ? t('form.viewMemories', { count: projectMemories.length })
              : t('form.createMemory')}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <p className="text-[11px] text-muted-foreground">{t('form.memoryHint')}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => void save()} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {tCommon('save')}
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
