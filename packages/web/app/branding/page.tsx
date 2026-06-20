'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/wordmark';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_WORDMARK_FONT,
  WORDMARK_FONTS,
  WORDMARK_FONT_STORAGE_KEY,
} from '@/lib/wordmark-fonts';

// Standalone full-screen playground (no app nav) for trialling wordmark fonts.
// Only reachable via the wand on Home. Picking a card sets the app-wide wordmark
// font live (persisted), and the icon toggle previews the mark beside each label.
export default function BrandingPage() {
  const [font, setFont, hydrated] = useLocalStorage<string>(
    WORDMARK_FONT_STORAGE_KEY,
    DEFAULT_WORDMARK_FONT,
  );
  const [showIcon, setShowIcon] = useState(true);

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Logo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a wordmark font — it applies across the app instantly. Toggle the icon to
              preview every combination.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={showIcon}
            onClick={() => setShowIcon((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-md border border-border/60 bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/20"
          >
            Show icon
            <span
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                showIcon ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform',
                  showIcon ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORDMARK_FONTS.map((f) => {
            const selected = hydrated && font === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFont(f.key)}
                aria-pressed={selected}
                className={cn(
                  'group relative flex min-h-[180px] min-w-0 flex-col items-center justify-center gap-5 overflow-hidden rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-colors',
                  selected
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border/60 hover:border-foreground/20 hover:bg-accent/30',
                )}
              >
                {selected ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                    <Check className="h-3 w-3" />
                    Active
                  </span>
                ) : null}

                <div className="flex items-center gap-3 overflow-hidden">
                  {showIcon ? (
                    <Image
                      src="/logo.PNG"
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                    />
                  ) : null}
                  <Wordmark font={f.key} className={cn('leading-none', f.previewSize)} />
                </div>

                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </span>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
