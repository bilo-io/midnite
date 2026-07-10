'use client';

import { Download, Loader2, RefreshCw, X } from 'lucide-react';
import type { MemoryArtifact } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';

/**
 * Full-screen viewer for a generated Studio artifact (Phase 65 D). Markdown kinds
 * render through {@link MarkdownPreview}; the infographic (untrusted model SVG)
 * renders inside a scripts-disabled sandboxed iframe so it can never execute.
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
  const download = () => {
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

          <div className="flex-1 overflow-y-auto p-5">
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
