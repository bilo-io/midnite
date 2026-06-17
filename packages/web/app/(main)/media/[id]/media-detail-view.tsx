'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ImageIcon,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  Video,
} from 'lucide-react';
import type { Media, MediaType, Project } from '@midnite/shared';
import { createMedia, deleteMedia, mediaFileUrl, updateMedia } from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import { MEDIA_PROVIDER_CATALOG, useMediaModels } from '@/lib/use-media-models';
import { ProviderSelect } from '@/components/provider-select';
import { PageHeader } from '@/components/page-header';
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_ICON: Record<MediaType, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  audio: Music2,
};

export function MediaDetailView({ mode, initialType, initial, projects }: Props) {
  const router = useRouter();
  const mediaType = mode === 'edit' ? initial.type : initialType;
  const TypeIcon = TYPE_ICON[mediaType];

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
      setGenerateError('Generation not yet available.');
    }
    setGenerateError('Generation not yet available.');
  }, [saved]);

  return (
    <>
      <PageHeader
        title={title || (mode === 'create' ? `New ${mediaType}` : 'Media')}
        icon="Images"
        actions={
          <Link
            href="/media"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All media
          </Link>
        }
      />

      <div className="container flex flex-col gap-5 pb-24 pt-4 lg:flex-row lg:items-start">
        {/* ── Left: Properties panel ── */}
        <aside className={cn('shrink-0 lg:sticky lg:top-16', propertiesOpen ? 'w-full lg:w-[260px]' : 'w-full lg:w-9')}>
          {!propertiesOpen ? (
            <button
              type="button"
              onClick={() => setPropertiesOpen(true)}
              aria-label="Show properties"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent lg:flex"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                  Properties
                </h2>
                <button
                  type="button"
                  onClick={() => setPropertiesOpen(false)}
                  aria-label="Hide properties"
                  className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent lg:flex"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => saveField({ title: title.trim() || undefined })}
                    placeholder="Untitled"
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => saveField({ description: description || undefined })}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full resize-none rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      saveField({ projectId: e.target.value || null });
                    }}
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Tags</label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onBlur={() =>
                      saveField({ tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean) })
                    }
                    placeholder="tag1, tag2"
                    className="w-full rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {saved && (
                  <>
                    <div className="h-px bg-border/60" />
                    <dl className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>Type</dt>
                        <dd className="capitalize">{saved.type}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Size</dt>
                        <dd>{saved.fileSize > 0 ? formatSize(saved.fileSize) : '—'}</dd>
                      </div>
                      {(saved.width != null || saved.height != null) && (
                        <div className="flex justify-between">
                          <dt>Dimensions</dt>
                          <dd>{saved.width ?? '?'} × {saved.height ?? '?'}</dd>
                        </div>
                      )}
                      {saved.duration != null && (
                        <div className="flex justify-between">
                          <dt>Duration</dt>
                          <dd>
                            {Math.floor(saved.duration / 60)}:{String(Math.floor(saved.duration % 60)).padStart(2, '0')}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt>MIME</dt>
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
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Center: Media viewer ── */}
        <div className="min-w-0 flex-1">
          {mode === 'create' && !saved ? (
            <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <TypeIcon className="h-12 w-12 text-muted-foreground/40" aria-hidden />
              <div>
                <p className="text-sm text-muted-foreground">Fill in the details and add a prompt,</p>
                <p className="text-sm text-muted-foreground">then click Generate — or save a placeholder.</p>
              </div>
              <button
                type="button"
                disabled={!title.trim() || saving}
                onClick={handleCreate}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save placeholder'}
              </button>
            </div>
          ) : saved ? (
            <MediaViewer media={saved} onLightbox={() => setLightboxOpen(true)} />
          ) : null}
        </div>

        {/* ── Right: Prompt / Generate panel ── */}
        <aside className={cn('shrink-0 lg:sticky lg:top-16', promptOpen ? 'w-full lg:w-[280px]' : 'w-full lg:w-9')}>
          {!promptOpen ? (
            <button
              type="button"
              onClick={() => setPromptOpen(true)}
              aria-label="Show prompt panel"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent lg:flex"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prompt / Generate
                </h2>
                <button
                  type="button"
                  onClick={() => setPromptOpen(false)}
                  aria-label="Hide prompt panel"
                  className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent lg:flex"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
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
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Provider</label>
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
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Model</label>
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
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onBlur={() => saveField({ prompt: prompt || undefined })}
                    placeholder="Describe what to generate…"
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
                  Generate
                </button>

                {generateError && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {generateError}
                  </p>
                )}

                <div className="h-px bg-border/60" />
                <p className="text-xs text-muted-foreground">No generation history.</p>
              </div>
            </div>
          )}
        </aside>
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
  if (media.type === 'image') {
    return (
      <button
        type="button"
        onClick={onLightbox}
        className="block w-full overflow-hidden rounded-xl border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open image in lightbox"
      >
        {media.filePath ? (
          <img
            src={mediaFileUrl(media.id)}
            alt={media.title}
            className="h-auto w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" aria-hidden />
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
            <Video className="h-12 w-12 text-muted-foreground/30" aria-hidden />
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
      <Music2 className="h-12 w-12 text-muted-foreground/30" aria-hidden />
    </div>
  );
}
