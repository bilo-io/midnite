'use client';

import { useState } from 'react';
import { ClipboardType, Link2, Loader2, Plus, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Upload types the input accepts (mirrors SOURCE_UPLOAD_MIME_TYPES). */
const UPLOAD_ACCEPT = '.pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  /** Add a link source (the live panel persists it). */
  onAddUrl: (url: string) => Promise<void>;
  /** Add a file source (upload, or a pasted-text blob). */
  onUploadFile: (file: File) => Promise<void>;
  /** Sources still allowed before the memory hits its cap. */
  remaining: number;
  onClose: () => void;
};

/**
 * NotebookLM-style add-source modal: a drop zone, a link paste field, a file
 * upload button, and a paste-text box (which becomes a `.txt` source). Only the
 * add paths the gateway actually supports — no web search / Drive stubs. Closes
 * once a source lands so the panel's ingest poll takes over.
 */
export function AddSourceModal({ onAddUrl, onUploadFile, remaining, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = remaining <= 0;

  const run = async (fn: () => Promise<void>) => {
    if (atLimit) {
      setError('This memory is at its source limit.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      setError('Enter a full URL, including https://');
      return;
    }
    void run(() => onAddUrl(u));
  };

  const addPastedText = () => {
    const text = pasted.trim();
    if (!text) return;
    const file = new File([text], 'Pasted text.txt', { type: 'text/plain' });
    void run(() => onUploadFile(file));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void run(() => onUploadFile(file));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add sources"
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Plus className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
            <span className="flex-1 text-sm font-semibold">Add sources</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{remaining} left</span>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Drop zone. */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-primary bg-accent/40' : 'border-border/70',
                (atLimit || busy) && 'pointer-events-none opacity-50',
              )}
            >
              <p className="text-base font-medium">Drop your files here</p>
              <p className="text-xs text-muted-foreground">PDF, Markdown, or plain text</p>
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent',
                  (atLimit || busy) && 'cursor-not-allowed opacity-50',
                )}
              >
                <Upload className="h-4 w-4" />
                Upload files
                <input
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  className="sr-only"
                  disabled={atLimit || busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void run(() => onUploadFile(file));
                  }}
                />
              </label>
            </div>

            {/* Link paste. */}
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Paste a link
              </span>
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                  placeholder="https://…  (GitHub, Notion, Google Docs, YouTube, any URL)"
                  disabled={atLimit || busy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={addUrl}
                  disabled={atLimit || busy || !url.trim()}
                  aria-label="Add link"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </label>

            {/* Paste text. */}
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardType className="h-3.5 w-3.5" /> Paste text
              </span>
              <textarea
                className={cn(inputClass, 'h-24 resize-y py-2')}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste notes or copied text — saved as a text source"
                disabled={atLimit || busy}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addPastedText}
                  disabled={atLimit || busy || !pasted.trim()}
                >
                  Add text
                </Button>
              </div>
            </label>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}
