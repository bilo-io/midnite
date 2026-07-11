'use client';

import { Download, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { isFileBackedFormat, type MemoryArtifact } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { memoryArtifactFileUrl } from '@/lib/api';

/**
 * Full-screen viewer for a generated Studio artifact. Markdown kinds render through
 * {@link MarkdownPreview}; the infographic (untrusted model SVG) renders inside a
 * scripts-disabled sandboxed iframe so it can never execute; audio/video (Phase 65
 * E) stream a media player from the gateway, with the script/outline below. When a
 * file-backed artifact degraded (no TTS/ffmpeg provider) it shows an honest hint +
 * the script/outline instead of a player.
 */
export function MemoryArtifactViewer({
  artifact,
  onClose,
  onRegenerate,
  regenerating,
}: {
  artifact: MemoryArtifact;
  onClose: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const fileBacked = isFileBackedFormat(artifact.format);
  const hasFile = fileBacked && !artifact.degraded && artifact.filePath !== null;
  const fileUrl = hasFile ? memoryArtifactFileUrl(artifact.memoryId, artifact.id) : null;

  const download = () => {
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = `${artifact.kind}.${artifact.format === 'audio' ? 'mp3' : 'mp4'}`;
      a.click();
      return;
    }
    const ext = artifact.format === 'svg' ? 'svg' : 'md';
    const mime = artifact.format === 'svg' ? 'image/svg+xml' : 'text/markdown';
    const blob = new Blob([artifact.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.kind}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const degradedHint =
    artifact.format === 'audio'
      ? 'No text-to-speech provider is configured, so this is the script only. Add an OpenAI key in Settings to generate spoken audio.'
      : 'No ffmpeg/TTS provider is available, so this is the slide outline only. Configure Memory Studio video to compose a narrated MP4.';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={artifact.title}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="flex-1 text-sm font-semibold">{artifact.title}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={download}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {fileBacked && artifact.degraded ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-600 dark:text-amber-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {degradedHint}
              </p>
            ) : null}

            {fileUrl && artifact.format === 'audio' ? (
              <audio controls src={fileUrl} className="w-full" aria-label={`${artifact.title} audio`} />
            ) : null}
            {fileUrl && artifact.format === 'video' ? (
              <video
                controls
                src={fileUrl}
                className="w-full rounded-lg border border-border/60 bg-black"
                aria-label={`${artifact.title} video`}
              />
            ) : null}

            {artifact.format === 'svg' ? (
              <iframe
                title={artifact.title}
                sandbox=""
                srcDoc={artifact.content}
                className="h-[60vh] w-full rounded-lg border border-border/60 bg-white"
              />
            ) : (
              <MarkdownPreview content={artifact.content} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
