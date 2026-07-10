'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  FileText,
  HelpCircle,
  Image,
  ListOrdered,
  Loader2,
  Play,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  MEMORY_ARTIFACT_META,
  type MemoryArtifact,
  type MemoryArtifactKind,
} from '@midnite/shared';
import { generateMemoryArtifact, getMemoryArtifacts } from '@/lib/api';
import { MemoryArtifactViewer } from './memory-artifact-viewer';

// Icons are a view concern, so they live here (not in shared). Audio & video are
// the file-backed Theme E kinds; they degrade to a script/outline with no provider.
const KIND_ICONS: Record<MemoryArtifactKind, LucideIcon> = {
  brief: FileText,
  faq: HelpCircle,
  'study-guide': ListOrdered,
  timeline: ListOrdered,
  infographic: Image,
  'audio-overview': AudioLines,
  'video-overview': Video,
};
const WIRED_KINDS: MemoryArtifactKind[] = [
  'brief',
  'faq',
  'study-guide',
  'timeline',
  'infographic',
  'audio-overview',
  'video-overview',
];

/**
 * The right "Studio" rail: generate artifacts from the memory's corpus. Each kind
 * gets a Generate/Regenerate button and a live status; a `pending` artifact is
 * polled until it resolves. Text/infographic render inline (Theme D); audio/video
 * (Theme E) render a media player, or the script/outline when a provider is off.
 */
export function MemoryStudioRail({ memoryId }: { memoryId: string }) {
  const [byKind, setByKind] = useState<Partial<Record<MemoryArtifactKind, MemoryArtifact>>>({});
  const [viewing, setViewing] = useState<MemoryArtifactKind | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const artifacts = await getMemoryArtifacts(memoryId);
      const map: Partial<Record<MemoryArtifactKind, MemoryArtifact>> = {};
      for (const a of artifacts) map[a.kind] = a;
      setByKind(map);
      return artifacts;
    } catch {
      return [];
    }
  }, [memoryId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any artifact is still generating; stop once all settle.
  const anyPending = Object.values(byKind).some((a) => a?.status === 'pending');
  useEffect(() => {
    if (!anyPending) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => void refresh(), 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [anyPending, refresh]);

  const generate = async (kind: MemoryArtifactKind) => {
    const pending = await generateMemoryArtifact(memoryId, kind);
    setByKind((prev) => ({ ...prev, [kind]: pending }));
  };

  const viewingArtifact = viewing ? byKind[viewing] : undefined;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Generate artifacts from this memory and its sources.
      </p>
      <ul className="space-y-1.5">
        {WIRED_KINDS.map((kind) => (
          <ArtifactRow
            key={kind}
            kind={kind}
            Icon={KIND_ICONS[kind]}
            artifact={byKind[kind]}
            onGenerate={() => void generate(kind)}
            onView={() => setViewing(kind)}
          />
        ))}
      </ul>

      {viewingArtifact && viewingArtifact.status === 'ready' ? (
        <MemoryArtifactViewer
          artifact={viewingArtifact}
          onClose={() => setViewing(null)}
          regenerating={false}
          onRegenerate={() => {
            void generate(viewingArtifact.kind);
            setViewing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ArtifactRow({
  kind,
  Icon,
  artifact,
  onGenerate,
  onView,
}: {
  kind: MemoryArtifactKind;
  Icon: LucideIcon;
  artifact: MemoryArtifact | undefined;
  onGenerate: () => void;
  onView: () => void;
}) {
  const label = MEMORY_ARTIFACT_META[kind].label;
  const status = artifact?.status;
  const pending = status === 'pending';

  return (
    <li>
      <div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-sm">
        <Icon className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
        <button
          type="button"
          onClick={status === 'ready' ? onView : onGenerate}
          disabled={pending}
          className="flex-1 truncate text-left transition-colors hover:text-foreground disabled:cursor-wait"
          title={status === 'ready' ? `View ${label}` : `Generate ${label}`}
        >
          {label}
        </button>
        <StatusChip status={status} onGenerate={onGenerate} pending={pending} />
      </div>
      {status === 'failed' && artifact?.error ? (
        <p className="mt-1 px-3 text-[11px] leading-snug text-destructive">{artifact.error}</p>
      ) : null}
      {status === 'ready' && artifact?.degraded ? (
        <p className="mt-1 px-3 text-[11px] leading-snug text-muted-foreground">
          {artifact.format === 'audio' ? 'Script only — no TTS provider' : 'Outline only — no video provider'}
        </p>
      ) : null}
    </li>
  );
}

function StatusChip({
  status,
  pending,
  onGenerate,
}: {
  status: MemoryArtifact['status'] | undefined;
  pending: boolean;
  onGenerate: () => void;
}) {
  if (pending) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Generating
      </span>
    );
  }
  if (status === 'ready') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[hsl(142_71%_45%)]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onGenerate}
        aria-label="Retry generation"
        className="flex items-center gap-1 text-[11px] text-destructive transition-colors hover:text-foreground"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Retry
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onGenerate}
      aria-label="Generate"
      className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
    >
      <Play className="h-3 w-3" />
      Generate
    </button>
  );
}
