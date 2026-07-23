'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, FolderOpen, Sparkles, UserRound } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderPicker } from '@/components/folder-picker';
import { getAgentsConfig, updatePrimaryAgent } from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_PROFILE, PROFILE_STORAGE_KEY, type Profile } from '@/lib/app-settings';
import { cn } from '@/lib/utils';

export function PersonalizationView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [profile, setProfile, hydrated] = useLocalStorage<Profile>(
    PROFILE_STORAGE_KEY,
    DEFAULT_PROFILE,
  );
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  // Flash a "Saved" indicator briefly after any edit settles.
  useEffect(() => {
    if (!hydrated) return;
    flashSaved();
    return () => clearTimeout(savedTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flash on content change only
  }, [profile.about, profile.guidelines]);

  // The fallback session working directory lives on the gateway (it must steer
  // PTYs there), not in localStorage. `null` until loaded; '' means unset.
  const [workDir, setWorkDir] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [workDirError, setWorkDirError] = useState<string | null>(null);

  useEffect(() => {
    getAgentsConfig()
      .then((c) => setWorkDir(c.primary.defaultWorkDir ?? ''))
      .catch(() => setWorkDir(''));
  }, []);

  const saveWorkDir = (next: string) => {
    setWorkDir(next);
    setWorkDirError(null);
    updatePrimaryAgent({ defaultWorkDir: next })
      .then((primary) => {
        setWorkDir(primary.defaultWorkDir ?? '');
        flashSaved();
      })
      .catch((e) => setWorkDirError(e instanceof Error ? e.message : t('personalization.couldNotSave')));
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex items-center justify-end gap-1.5 text-xs text-muted-foreground transition-opacity',
          saved ? 'opacity-100' : 'opacity-0',
        )}
        aria-live="polite"
      >
        <Check className="h-3.5 w-3.5" />
        {tc('saved')}
      </div>

      <Accordion title={t('personalization.aboutYou')} icon={<UserRound className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            {t('personalization.aboutYouDescription')}
          </p>
          <Textarea
            value={profile.about}
            onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
            placeholder={t('personalization.aboutPlaceholder')}
            className="min-h-[120px] resize-y"
          />
        </div>
      </Accordion>

      <Accordion title={t('personalization.workingDirectory')} icon={<FolderOpen className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            {t('personalization.workingDirectoryDescription')}
          </p>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-9 min-w-0 flex-1 items-center rounded-md border border-input bg-background px-3 font-mono text-xs transition-opacity',
                workDir === null ? 'opacity-0' : 'opacity-100',
              )}
            >
              {workDir ? (
                <span className="truncate" title={workDir}>
                  {workDir}
                </span>
              ) : (
                <span className="text-muted-foreground">{t('personalization.notSet')}</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setPicking(true)}
              disabled={workDir === null}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {t('personalization.browse')}
            </Button>
            {workDir ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => saveWorkDir('')}
              >
                {t('personalization.clear')}
              </Button>
            ) : null}
          </div>
          {workDirError ? <p className="text-xs text-destructive">{workDirError}</p> : null}
        </div>
      </Accordion>

      <Accordion title={t('personalization.agentGuidelines')} icon={<Sparkles className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            {t('personalization.agentGuidelinesDescription')}
          </p>
          <Textarea
            value={profile.guidelines}
            onChange={(e) => setProfile((p) => ({ ...p, guidelines: e.target.value }))}
            placeholder={t('personalization.guidelinesPlaceholder')}
            className="min-h-[160px] resize-y"
          />
        </div>
      </Accordion>

      {picking ? (
        <FolderPicker
          initialPath={workDir?.trim() || undefined}
          onSelect={saveWorkDir}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
