'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  type LucideIcon,
  Music2,
  Trash2,
  Video,
} from 'lucide-react';
import type { Media, MediaType, Project } from '@midnite/shared';
import { createMedia, deleteMedia, mediaFileUrl, updateMedia } from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';
import { MEDIA_PROVIDER_CATALOG, useMediaModels } from '@/lib/use-media-models';
import { ProviderSelect } from '@/components/provider-select';
import { useMediaTypeLabel } from '@/lib/i18n-labels';
import { useLocaleFormat } from '@/lib/use-locale-format';
import { PageHeader } from '@/components/page-header';
import { RailFloatingToggle, RailHeaderToggle } from '@midnite/ui';
import { cn } from '@/lib/utils';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

const WaveSurferPlayer = dynamic(
  () => import('./wavesurfer-player').then((m) => m.WaveSurferPlayer),
  { ssr: false },
);

type Props =
  | { mode: 'create'; initialType: MediaType; projects: Project[]; initial?: never }
  | { mode: 'edit'; initial: Media; projects: Project[]; initialType?: never };

/** Byte-unit suffixes are catalog copy; the number follows the active locale. */
function useSizeLabel(): (bytes: number) => string {
  const t = useTranslations('media');
  const { number } = useLocaleFormat();
  const one = (v: number) => number(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (bytes) => {
    if (bytes < 1024) return t('size.bytes', { value: number(bytes) });
    if (bytes < 1024 * 1024) return t('size.kilobytes', { value: one(bytes / 1024) });
    return t('size.megabytes', { value: one(bytes / (1024 * 1024)) });
  };
}

// `LucideIcon`, not `React.ElementType`: the latter maps over `keyof
// JSX.IntrinsicElements`, which @react-three/fiber (Phase 63) bloats to hundreds
// of three.js elements — collapsing the mapped type to `never`.
const TYPE_ICON: Record<MediaType, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music2,
};

export function MediaDetailView({ mode, initialType, initial, projects }: Props) {
  const router = useRouter();
  const mediaType = mode === 'edit' ? initial.type : initialType;
  const TypeIcon = TYPE_ICON[mediaType];

  const t = useTranslations('media');
  const tCommon = useTranslations('common');
  const typeLabel = useMediaTypeLabel();
  const formatSize = useSizeLabel();
  const propertiesRail = t('detail.propertiesRail');
  const promptRail = t('detail.promptRail');
  const isMobile = useIsMobile();
  const [propertiesOpen, setPropertiesOpen] = useLocalStorage('midnite.media.properties', true);
  const [promptOpen, setPromptOpen] = useLocalStorage('midnite.media.prompt', true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaModels, setMediaModel] = useMediaModels();
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [projectId, setProjectId] = useState(initial?.projectId ?? '');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Media | null>(initial ?? null);

  const saveField = useCallback(
    async (patch: Parameters<typeof updateMedia>[1]) => {
      if (mode !== 'edit' || !saved) return;
      try {
        const updated = await updateMedia(saved.id, patch);
        setSaved(updated);
      } catch {
        // best-effort save
      }
    },
    [mode, saved],
  );

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await createMedia({
        type: mediaType,
        title: title.trim(),
        description: description || undefined,
        projectId: projectId || undefined,
        prompt: prompt || undefined,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        filePath: '',
        mimeType: 'application/octet-stream',
        fileSize: 0,
      });
      setSaved(created);
      router.replace(`/media/view?id=${created.id}`);
    } catch {
      // show nothing — the form stays editable
    } finally {
      setSaving(false);
    }
  }, [title, description, projectId, prompt, tagsInput, mediaType, router]);

  const handleDelete = useCallback(async () => {
    if (!saved) return;
    try {
      await deleteMedia(saved.id);
      router.push('/media');
    } catch {
      // stay on page
    }
  }, [saved, router]);

  const handleGenerate = useCallback(async () => {
    if (!saved) return;
    setGenerateError(null);
    try {
      await fetch(`${process.env['NEXT_PUBLIC_GATEWAY_URL'] ?? 'http://localhost:7777'}/media/${saved.id}/generate`, { method: 'POST' });
    } catch {
      setGenerateError(t('detail.generationUnavailable'));
    }
    setGenerateError(t('detail.generationUnavailable'));
  }, [saved, t]);

  return (
    <>
      <PageHeader
        title={
          title ||
          (mode === 'create'
            ? t('detail.newTitle', { type: typeLabel(mediaType).toLocaleLowerCase() })
            : t('detail.fallbackTitle'))
        }
        icon="Images"
        actions={
          isMobile ? (
            <div className="flex items-center gap-2">
              <RailHeaderToggle
                side="left"
                open={propertiesOpen}
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                label={tCommon('ui.rail.toggleLeftPanel')}
              />
              <RailHeaderToggle
                side="right"
                open={promptOpen}
                onClick={() => setPromptOpen(!promptOpen)}
                label={tCommon('ui.rail.toggleRightPanel')}
              />
            </div>
          ) : undefined
        }
      />

      <div className="container flex flex-col gap-5 pb-24 pt-4 lg:flex-row lg:items-start">
        {/* ── Left: Properties panel ── */}
        {/* Desktop: animates its width (260px ↔ 0), the fixed-width inner panel
            clipped by overflow-hidden so it slides. Mobile: a drawer, only in the
            layout when open. The toggle lives in the content layer (see center). */}
        {(!isMobile || propertiesOpen) && (
          <aside
            aria-hidden={!propertiesOpen}
            className={cn(
              'w-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-16',
              propertiesOpen ? 'lg:w-[260px]' : 'lg:w-0',
            )}
          >
            <div
              className={cn(
                'rounded-xl border border-border/60 bg-card p-4 transition-opacity duration-200 motion-reduce:transition-none lg:w-[260px]',
                propertiesOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <div className="mb-3 flex items-center gap-1.5">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                  {propertiesRail}
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('detail.titleLabel')}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => saveField({ title: title.trim() || undefined })}
                    placeholder={t('detail.titlePlaceholder')}
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('detail.descriptionLabel')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => saveField({ description: description || undefined })}
                    placeholder={t('detail.descriptionPlaceholder')}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('detail.projectLabel')}
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      saveField({ projectId: e.target.value || null });
                    }}
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">{t('detail.noProject')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('detail.tagsLabel')}
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onBlur={() =>
                      saveField({ tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean) })
                    }
                    placeholder={t('detail.tagsPlaceholder')}
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {saved && (
                  <>
                    <div className="h-px bg-border/60" />
                    <dl className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>{t('detail.type')}</dt>
                        <dd>{typeLabel(saved.type)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>{t('detail.size')}</dt>
                        <dd>{saved.fileSize > 0 ? formatSize(saved.fileSize) : t('detail.noValue')}</dd>
                      </div>
                      {(saved.width != null || saved.height != null) && (
                        <div className="flex justify-between">
                          <dt>{t('detail.dimensions')}</dt>
                          <dd>
                            {t('detail.dimensionsValue', {
                              width: saved.width ?? t('detail.unknownDimension'),
                              height: saved.height ?? t('detail.unknownDimension'),
                            })}
                          </dd>
                        </div>
                      )}
                      {saved.duration != null && (
                        <div className="flex justify-between">
                          <dt>{t('detail.duration')}</dt>
                          <dd>
                            {Math.floor(saved.duration / 60)}:{String(Math.floor(saved.duration % 60)).padStart(2, '0')}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt>{t('detail.mime')}</dt>
                        <dd className="truncate">{saved.mimeType}</dd>
                      </div>
                    </dl>
                    <div className="h-px bg-border/60" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {tCommon('delete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ── Center: Media viewer ── */}
        <div className="relative min-w-0 flex-1">
          {/* Content-layer toggles: float over the viewer's top corners and glide
              with each rail as it animates. Desktop-only — mobile uses the header. */}
          {!isMobile && (
            <>
              <RailFloatingToggle
                side="left"
                open={propertiesOpen}
                title={propertiesRail}
                onToggle={() => setPropertiesOpen(!propertiesOpen)}
                collapseLabel={tCommon('ui.rail.collapse', { title: propertiesRail })}
                expandLabel={tCommon('ui.rail.expand', { title: propertiesRail })}
              />
              <RailFloatingToggle
                side="right"
                open={promptOpen}
                title={promptRail}
                onToggle={() => setPromptOpen(!promptOpen)}
                collapseLabel={tCommon('ui.rail.collapse', { title: promptRail })}
                expandLabel={tCommon('ui.rail.expand', { title: promptRail })}
              />
            </>
          )}
          <div className="lg:pt-11">
            {mode === 'create' && !saved ? (
              <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-border/60 p-10 text-center">
                <TypeIcon className="h-12 w-12 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.createHintLine1')}</p>
                  <p className="text-sm text-muted-foreground">{t('detail.createHintLine2')}</p>
                </div>
                <button
                  type="button"
                  disabled={!title.trim() || saving}
                  onClick={handleCreate}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? t('detail.saving') : t('detail.savePlaceholder')}
                </button>
              </div>
            ) : saved ? (
              <MediaViewer media={saved} onLightbox={() => setLightboxOpen(true)} />
            ) : null}
          </div>
        </div>

        {/* ── Right: Prompt / Generate panel ── */}
        {(!isMobile || promptOpen) && (
          <aside
            aria-hidden={!promptOpen}
            className={cn(
              'w-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-16',
              promptOpen ? 'lg:w-[280px]' : 'lg:w-0',
            )}
          >
            <div
              className={cn(
                'rounded-xl border border-border/60 bg-card p-4 transition-opacity duration-200 motion-reduce:transition-none lg:w-[280px]',
                promptOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <div className="mb-3 flex items-center gap-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {promptRail}
                </h2>
              </div>

              <div className="space-y-3">
                {/* Provider + model selectors */}
                {(() => {
                  const sel = mediaModels[mediaType];
                  const providers = MEDIA_PROVIDER_CATALOG[mediaType];
                  const currentProvider = providers.find((p) => p.provider === sel.provider) ?? providers[0]!;
                  return (
                    <>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          {t('detail.providerLabel')}
                        </label>
                        <ProviderSelect
                          providers={providers}
                          value={sel.provider}
                          onChange={(prov) => {
                            const p = providers.find((x) => x.provider === prov) ?? providers[0]!;
                            setMediaModel(mediaType, { provider: p.provider, model: p.models[0]!.value });
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          {t('detail.modelLabel')}
                        </label>
                        <select
                          value={sel.model}
                          onChange={(e) => setMediaModel(mediaType, { provider: sel.provider, model: e.target.value })}
                          className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {currentProvider.models.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  );
                })()}

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('detail.promptLabel')}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onBlur={() => saveField({ prompt: prompt || undefined })}
                    placeholder={t('detail.promptPlaceholder')}
                    rows={5}
                    className="w-full resize-none rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <button
                  type="button"
                  disabled={!saved}
                  onClick={handleGenerate}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {t('detail.generate')}
                </button>

                {generateError && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {generateError}
                  </p>
                )}

                <div className="h-px bg-border/60" />
                <p className="text-xs text-muted-foreground">{t('detail.noGenerationHistory')}</p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {lightboxOpen && saved?.type === 'image' && (
        <Lightbox
          open
          close={() => setLightboxOpen(false)}
          slides={[{ src: mediaFileUrl(saved.id) }]}
        />
      )}
    </>
  );
}

function MediaViewer({ media, onLightbox }: { media: Media; onLightbox: () => void }) {
  const t = useTranslations('media');
  if (media.type === 'image') {
    return (
      <button
        type="button"
        onClick={onLightbox}
        className="block w-full overflow-hidden rounded-xl border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('detail.openLightbox')}
      >
        {media.filePath ? (
          <img
            src={mediaFileUrl(media.id)}
            alt={media.title}
            className="h-auto w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground" aria-hidden />
          </div>
        )}
      </button>
    );
  }

  if (media.type === 'video') {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60">
        {media.filePath ? (
          <video
            src={mediaFileUrl(media.id)}
            controls
            className="w-full"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted">
            <Video className="h-12 w-12 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>
    );
  }

  // audio
  return media.filePath ? (
    <WaveSurferPlayer src={mediaFileUrl(media.id)} />
  ) : (
    <div className="flex aspect-video items-center justify-center rounded-xl border border-border/60 bg-muted">
      <Music2 className="h-12 w-12 text-muted-foreground" aria-hidden />
    </div>
  );
}
