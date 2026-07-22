'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageIcon, Images, Layers2, LayoutGrid, List, ListTree, Music2, PanelLeftClose, PanelLeftOpen, Play, Video, type LucideIcon } from 'lucide-react';
import type { Media, MediaType, Project } from '@midnite/shared';
import { MEDIA_TYPES } from '@midnite/shared';
import { CountPill } from '@/components/count-pill';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { SearchBar } from '@/components/search-bar';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { NewMediaButton } from './new-media-button';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import { MEDIA_PROVIDER_CATALOG, useMediaModels } from '@/lib/use-media-models';
import { ModelSelect, ProjectSelect, ProviderSelectRS } from '@/components/media-select';
import { mediaFileUrl } from '@/lib/api';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

type TabType = 'all' | MediaType;
type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.media.view';
// Grid is the masonry gallery; list/table are flat layouts across types.
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'table', label: 'Table view', Icon: ListTree },
];

const TYPE_LABELS: Record<TabType, string> = {
  all: 'All',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
};

const TYPE_ICONS: Record<TabType, LucideIcon> = {
  all: Layers2,
  image: ImageIcon,
  video: Video,
  audio: Music2,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  items: Media[];
  projects: Project[];
  error: string | null;
};

export function MediaView({ items, projects, error }: Props) {
  useGatewayErrorToast(error);
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('midnite.media.sidebar', true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TabType>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mediaModels, setMediaModel] = useMediaModels();

  const [view, setView] = useLocalStorage<View>(VIEW_STORAGE_KEY, 'grid');
  const onSetView = useCallback(
    (next: View) => setView((VIEWS as readonly string[]).includes(next) ? next : 'grid'),
    [setView],
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const filtered = items.filter((m) => {
    if (selectedProjectId && m.projectId !== selectedProjectId) return false;
    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (q && ![m.title, m.description ?? ''].some((f) => f.toLowerCase().includes(q))) return false;
    return true;
  });

  const images = filtered.filter((m) => m.type === 'image');
  const videos = filtered.filter((m) => m.type === 'video');
  const audios = filtered.filter((m) => m.type === 'audio');

  const lightboxSlides = images.map((m) => ({ src: mediaFileUrl(m.id) }));

  const renderImages = (list: Media[]) => {
    if (list.length === 0) return null;
    return (
      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
        {list.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              const idx = images.indexOf(m);
              setLightboxIndex(idx >= 0 ? idx : 0);
            }}
            className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg border border-border/60 bg-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={m.title}
          >
            {m.filePath ? (
              <img
                src={mediaFileUrl(m.id)}
                alt={m.title}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
              </div>
            )}
            <p className="truncate px-2 py-1.5 text-left text-xs text-muted-foreground">{m.title}</p>
          </button>
        ))}
      </div>
    );
  };

  const renderVideos = (list: Media[]) => {
    if (list.length === 0) return null;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <Link
            key={m.id}
            href={`/media/view?id=${m.id}`}
            className="group overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-border"
          >
            <div className="relative aspect-video bg-muted">
              {m.filePath ? (
                <video
                  src={mediaFileUrl(m.id)}
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Video className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur">
                  <Play className="h-4 w-4 text-foreground" aria-hidden />
                </div>
              </div>
              {m.duration != null && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-background/80 px-1 py-0.5 text-[10px] tabular-nums backdrop-blur">
                  {formatDuration(m.duration)}
                </span>
              )}
            </div>
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{m.title}</p>
              {m.fileSize > 0 && (
                <p className="text-xs text-muted-foreground">{formatSize(m.fileSize)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderAudio = (list: Media[]) => {
    if (list.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5">
        {list.map((m) => (
          <Link
            key={m.id}
            href={`/media/view?id=${m.id}`}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Music2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              {m.description && (
                <p className="truncate text-xs text-muted-foreground">{m.description}</p>
              )}
            </div>
            {m.duration != null && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatDuration(m.duration)}
              </span>
            )}
          </Link>
        ))}
      </div>
    );
  };

  // Flat list across every type — used by the list view.
  const renderList = (list: Media[]) => (
    <div className="flex flex-col gap-1.5">
      {list.map((m) => {
        const Icon = TYPE_ICONS[m.type as TabType] ?? Layers2;
        return (
          <Link
            key={m.id}
            href={`/media/view?id=${m.id}`}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:border-border hover:bg-accent/40"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
              {m.type === 'image' && m.filePath ? (
                <img
                  src={mediaFileUrl(m.id)}
                  alt={m.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              {m.description ? (
                <p className="truncate text-xs text-muted-foreground">{m.description}</p>
              ) : null}
            </div>
            <span className="hidden shrink-0 text-xs capitalize text-muted-foreground sm:inline">
              {m.type}
            </span>
            {m.fileSize > 0 ? (
              <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                {formatSize(m.fileSize)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );

  // Columnar table across every type — used by the table view.
  const renderTable = (list: Media[]) => (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 text-right font-medium">Size</th>
          </tr>
        </thead>
        <tbody>
          {list.map((m) => {
            const project = m.projectId ? projectsById.get(m.projectId) : undefined;
            return (
              <tr
                key={m.id}
                onClick={() => router.push(`/media/view?id=${m.id}`)}
                className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="px-3 py-2 font-medium">{m.title}</td>
                <td className="px-3 py-2 capitalize text-muted-foreground">{m.type}</td>
                <td className="px-3 py-2 text-muted-foreground">{project?.name ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {m.fileSize > 0 ? formatSize(m.fileSize) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGallery = () => {
    // List and table are flat across types; grid keeps the per-type masonry.
    if (view !== 'grid') {
      if (filtered.length === 0) return <Empty type={selectedType} />;
      return view === 'list' ? renderList(filtered) : renderTable(filtered);
    }
    if (selectedType === 'image') {
      return images.length === 0 ? <Empty type="image" /> : renderImages(images);
    }
    if (selectedType === 'video') {
      return videos.length === 0 ? <Empty type="video" /> : renderVideos(videos);
    }
    if (selectedType === 'audio') {
      return audios.length === 0 ? <Empty type="audio" /> : renderAudio(audios);
    }
    // all
    if (filtered.length === 0) {
      return <Empty type="all" />;
    }
    return (
      <div className="space-y-6">
        {images.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Images</h2>
            {renderImages(images)}
          </section>
        )}
        {videos.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video</h2>
            {renderVideos(videos)}
          </section>
        )}
        {audios.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audio</h2>
            {renderAudio(audios)}
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 gap-0">
      {/* Secondary sidebar — pinned at the shared 48px offset (collapsed header
          in a browser, title bar on desktop), same lockstep as StickyToolbar. */}
      <aside
        className={cn(
          'sticky top-12 h-[calc(100dvh_-_3rem)] shrink-0 overflow-y-auto border-r border-border/60 transition-[width] duration-200',
          sidebarOpen ? 'w-[220px]' : 'w-9',
        )}
      >
        {!sidebarOpen ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Expand media sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Media
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Collapse media sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* Project selector */}
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Project
              </label>
              <ProjectSelect
                projects={projects}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
              />
            </div>

            {/* Type tabs */}
            <div className="mb-3 flex flex-col gap-0.5">
              {(['all', ...MEDIA_TYPES] as TabType[]).map((t) => {
                const Icon = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                      selectedType === t
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>

            <div className="my-2 h-px bg-border/60" />

            {/* Per-type provider + model selectors */}
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Generation models
              </p>
              {MEDIA_TYPES.map((type) => {
                const sel = mediaModels[type];
                const providers = MEDIA_PROVIDER_CATALOG[type];
                const currentProvider = providers.find((p) => p.provider === sel.provider) ?? providers[0]!;
                return (
                  <div key={type} className="mb-3">
                    <p className="mb-1 text-[11px] capitalize text-muted-foreground">{type}</p>
                    <ProviderSelectRS
                      providers={providers}
                      value={sel.provider}
                      onChange={(prov) => {
                        const p = providers.find((x) => x.provider === prov) ?? providers[0]!;
                        setMediaModel(type, { provider: p.provider, model: p.models[0]!.value });
                      }}
                    />
                    <div className="mt-1">
                      <ModelSelect
                        models={currentProvider.models}
                        value={sel.model}
                        onChange={(model) => setMediaModel(type, { provider: sel.provider, model })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Gallery. No overflow on <main>: the document must stay the one scroll
          region or the sticky toolbar would compute against a non-scrolling
          inner container and never pin. */}
      <main className="min-w-0 flex-1 p-4 lg:p-6">
        <StickyToolbar className="mb-4">
          <CountPill count={filtered.length} noun="item" />
          <div className="flex shrink-0 items-center gap-2">
            <SearchBar placeholder="Search media" />
            <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
              {VIEW_OPTIONS.map(({ value, label, Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  aria-pressed={view === value}
                  onClick={() => onSetView(value)}
                  className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <NewMediaButton />
          </div>
        </StickyToolbar>

        {renderGallery()}
      </main>

      {/* Lightbox for images */}
      {lightboxIndex !== null && (
        <Lightbox
          open
          close={() => setLightboxIndex(null)}
          index={lightboxIndex}
          slides={lightboxSlides}
        />
      )}
    </div>
  );
}

function Empty({ type }: { type: TabType }) {
  return (
    <EmptyState
      Icon={Images}
      title={type === 'all' ? 'No media yet' : `No ${type} items yet`}
      description="Generate or upload media to build out your library."
      action={<NewMediaButton variant="large" />}
    />
  );
}
