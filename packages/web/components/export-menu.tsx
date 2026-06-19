'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Check, Copy, Download, FileDown, FileText, Loader2 } from 'lucide-react';
import { MarkdownPreview } from '@/components/markdown-preview';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

/**
 * A reusable report-export dropdown: Copy Markdown · Download .md · Download PDF.
 * It is format-agnostic — the caller supplies a `fetchMarkdown()` (the gateway's
 * `toMarkdown()` for the domain) and a base `filename`; this component handles
 * the three output paths:
 *   - md      → clipboard copy / Blob download.
 *   - pdf     → render the markdown into an isolated print container and call
 *               `window.print()` (an `@media print` stylesheet hides the app
 *               chrome). `window.print()` works in both the browser and Electron
 *               (the user picks "Save as PDF" via the print dialog).
 * No PDF library is bundled — print-to-PDF is a locked decision.
 *
 * TODO(desktop): for true one-click silent PDF in the Electron app, add an IPC +
 * preload bridge to `webContents.printToPDF()` and prefer it here when
 * `window.__MIDNITE_PRINT_TO_PDF` is present, falling back to `window.print()`.
 * Skipped for v1 — the print-dialog path already produces a PDF everywhere.
 */

type Props = {
  /** Fetches the report markdown (typically a `lib/api.ts` client call). */
  fetchMarkdown: () => Promise<string>;
  /** Base filename (no extension) for downloads and the print title. */
  filename: string;
  /** Disable the trigger (e.g. while a run is still in progress). */
  disabled?: boolean;
  className?: string;
};

const PRINT_CONTAINER_ID = 'midnite-print-root';
const PRINT_STYLE_ID = 'midnite-print-style';

/** The `@media print` rules that isolate the print container from the app. Kept
 *  in a `<style>` injected on demand so it never affects normal screen layout. */
const PRINT_CSS = `
@media print {
  body > *:not(#${PRINT_CONTAINER_ID}) { display: none !important; }
  #${PRINT_CONTAINER_ID} {
    display: block !important;
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
}
#${PRINT_CONTAINER_ID} { display: none; }
`;

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has had a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportMenu({ fetchMarkdown, filename, disabled, className }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'copy' | 'md' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // The print container + its React root persist across prints so we can unmount.
  const printRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Tear down the print container's React root on unmount.
  useEffect(() => {
    return () => {
      printRootRef.current?.unmount();
      printRootRef.current = null;
      document.getElementById(PRINT_CONTAINER_ID)?.remove();
      document.getElementById(PRINT_STYLE_ID)?.remove();
    };
  }, []);

  const copyMarkdown = useCallback(async () => {
    setBusy('copy');
    try {
      const markdown = await fetchMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Markdown copied to clipboard');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy markdown');
    } finally {
      setBusy(null);
    }
  }, [fetchMarkdown, toast]);

  const downloadMarkdown = useCallback(async () => {
    setBusy('md');
    try {
      const markdown = await fetchMarkdown();
      const name = filename.endsWith('.md') ? filename : `${filename}.md`;
      triggerDownload(name, markdown, 'text/markdown;charset=utf-8');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download markdown');
    } finally {
      setBusy(null);
    }
  }, [fetchMarkdown, filename, toast]);

  const downloadPdf = useCallback(async () => {
    setBusy('pdf');
    try {
      const markdown = await fetchMarkdown();

      // Ensure the print stylesheet is present.
      if (!document.getElementById(PRINT_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = PRINT_STYLE_ID;
        style.textContent = PRINT_CSS;
        document.head.appendChild(style);
      }

      // Ensure the print container + its React root exist.
      let container = document.getElementById(PRINT_CONTAINER_ID);
      if (!container) {
        container = document.createElement('div');
        container.id = PRINT_CONTAINER_ID;
        document.body.appendChild(container);
      }
      if (!printRootRef.current) {
        printRootRef.current = createRoot(container);
      }

      // Render the markdown, wait a tick for layout, then open the print dialog.
      // The page title seeds the default "Save as PDF" filename.
      const previousTitle = document.title;
      document.title = filename;
      printRootRef.current.render(
        <div style={{ padding: '2rem', color: '#000', background: '#fff' }}>
          <MarkdownPreview content={markdown} />
        </div>,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.print();
      document.title = previousTitle;
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not render PDF');
    } finally {
      setBusy(null);
    }
  }, [fetchMarkdown, filename, toast]);

  const items: { key: 'copy' | 'md' | 'pdf'; label: string; icon: typeof Copy; run: () => void }[] = [
    { key: 'copy', label: 'Copy Markdown', icon: copied ? Check : Copy, run: () => void copyMarkdown() },
    { key: 'md', label: 'Download .md', icon: Download, run: () => void downloadMarkdown() },
    { key: 'pdf', label: 'Download PDF', icon: FileDown, run: () => void downloadPdf() },
  ];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Export"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <FileText className="h-3.5 w-3.5" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <ul className="p-1">
            {items.map(({ key, label, icon: Icon, run }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={run}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {busy === key ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
