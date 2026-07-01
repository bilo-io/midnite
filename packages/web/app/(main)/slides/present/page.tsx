'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, FileDown, X } from 'lucide-react';
import { getDeck } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { RevealPreview } from '@/components/slides/reveal-preview';
import { downloadDeckHtml } from '@/lib/deck-export';
import { useToast } from '@/components/toast';

function Present() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  // reveal auto-detects the `print-pdf` token in the URL and lays out for print.
  const printPdf = params.toString().includes('print-pdf');
  const toast = useToast();

  const { data: deck, loading, error } = useApiData((signal) => getDeck(id, signal), [id]);

  // In print-pdf mode, once the deck has rendered, kick off the browser print
  // dialog (→ Save as PDF). A short delay lets reveal finish its print layout.
  useEffect(() => {
    if (!printPdf || !deck) return;
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [printPdf, deck]);

  if (!id || error || (!loading && !deck)) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background text-sm text-muted-foreground">
        Deck not found.{' '}
        <Link href="/slides" className="ml-1 underline">
          Back to decks
        </Link>
      </div>
    );
  }
  if (!deck) return <div className="fixed inset-0 z-50 bg-background" />;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <RevealPreview slides={deck.content.slides} theme={deck.content.theme} mode="present" />

      {!printPdf ? (
        <div className="group absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 p-1 opacity-40 shadow-sm backdrop-blur transition-opacity hover:opacity-100">
          <button
            type="button"
            aria-label="Export PDF"
            title="Export PDF"
            onClick={() => {
              // Reload into print-pdf mode so reveal initialises its print layout.
              window.location.search = `?id=${encodeURIComponent(id)}&print-pdf`;
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <FileDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Export HTML"
            title="Export standalone HTML"
            onClick={() => {
              downloadDeckHtml(deck).catch((err) =>
                toast.error(err instanceof Error ? err.message : 'Export failed'),
              );
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Download className="h-4 w-4" />
          </button>
          <Link
            href={`/slides/view?id=${encodeURIComponent(id)}`}
            aria-label="Exit present mode"
            title="Exit (Esc closes overview first)"
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function PresentPage() {
  return (
    <Suspense fallback={null}>
      <Present />
    </Suspense>
  );
}
