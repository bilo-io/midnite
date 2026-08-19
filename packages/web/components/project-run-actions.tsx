'use client';

import { useState } from 'react';
import { Hammer, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Project } from '@midnite/shared';
import { RunCommandModal } from '@/components/run-command-modal';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { buildProject, previewProject } from '@/lib/api';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';

type RunKind = 'build' | 'launch';

const RUN_ICONS: Record<RunKind, typeof Hammer> = { build: Hammer, launch: Rocket };

/**
 * Build/Launch icon buttons for a project — shown in each per-project board
 * header (to the right of the project tag). Each runs the project's configured
 * `buildCommand`/`startCommand`; how it runs follows the `projectRunMode`
 * setting: a terminal modal streaming the command live, or a background run
 * owned by the gateway (Settings → System → Run actions). A button only renders
 * when its command (and the project's work directory) is configured.
 */
export function ProjectRunActions({ project }: { project: Project }) {
  const t = useTranslations('board');
  const toast = useToast();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [openRun, setOpenRun] = useState<RunKind | null>(null);

  if (!project.workDir?.trim()) return null;
  const kinds: RunKind[] = [
    ...(project.buildCommand?.trim() ? (['build'] as const) : []),
    ...(project.startCommand?.trim() ? (['launch'] as const) : []),
  ];
  if (kinds.length === 0) return null;

  const start = (kind: RunKind, background: boolean) =>
    kind === 'build'
      ? buildProject(project.id, background ? { background } : undefined)
      : previewProject(project.id, background ? { background } : undefined);

  const run = async (kind: RunKind) => {
    if (settings.projectRunMode === 'terminal') {
      setOpenRun(kind);
      return;
    }
    try {
      await start(kind, true);
      toast.success(t(`runActions.${kind}Started`, { name: project.name }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(`runActions.${kind}Failed`));
    }
  };

  return (
    <>
      {kinds.map((kind) => {
        const Icon = RUN_ICONS[kind];
        return (
          <Button
            key={kind}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t(`runActions.${kind}`, { name: project.name })}
            title={t(`runActions.${kind}`, { name: project.name })}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              // The buttons sit in an accordion header — don't toggle/drag it.
              e.stopPropagation();
              void run(kind);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
      {openRun ? (
        <RunCommandModal
          title={t(`runActions.${openRun}Title`, { name: project.name })}
          start={() => start(openRun, false)}
          onClose={() => setOpenRun(null)}
        />
      ) : null}
    </>
  );
}
