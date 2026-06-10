'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScrolled } from '@/lib/use-scrolled';
import { useTypewriter } from '@/lib/use-typewriter';

/** Blinking caret shown at the end of a field while it's still typing. */
function Caret({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'ml-0.5 inline-block w-px self-stretch bg-current align-baseline text-transparent animate-[blink_1s_step-end_infinite]',
        className,
      )}
    >
      |
    </span>
  );
}

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  size?: 'default' | 'lg'; // dashboard uses 'lg'
  showGrid?: boolean; // dashboard's decorative bg-grid
  actions?: ReactNode; // right-aligned controls (e.g. a search bar)
};

export function PageHeader({
  title,
  description,
  size = 'default',
  showGrid = false,
  actions,
}: PageHeaderProps) {
  const scrolled = useScrolled();

  // Type the title and subtitle out together. Both run over the same duration so
  // they finish simultaneously regardless of length. Only string descriptions
  // can be typed; anything richer (ReactNode) renders immediately.
  const { typed: typedTitle, done: titleDone } = useTypewriter(title);
  const descriptionIsString = typeof description === 'string';
  const { typed: typedDescription, done: descriptionDone } = useTypewriter(descriptionIsString ? description : '', {
    enabled: descriptionIsString,
  });

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b transition-colors duration-200 motion-reduce:transition-none',
        scrolled
          ? 'border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
          : 'border-transparent bg-transparent',
      )}
    >
      {/* re-center content to align with the page body's container below */}
      <div
        className={cn(
          'container relative transition-[padding] duration-200 motion-reduce:transition-none',
          scrolled ? 'py-3' : 'py-6',
        )}
      >
        {showGrid && (
          <div
            aria-hidden
            className={cn(
              'bg-grid pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 transition-opacity duration-300 motion-reduce:transition-none',
              scrolled ? 'opacity-0' : 'opacity-50',
            )}
          />
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                'font-semibold tracking-tight transition-all duration-200 motion-reduce:transition-none',
                size === 'lg' ? (scrolled ? 'text-2xl' : 'text-3xl') : scrolled ? 'text-xl' : 'text-2xl',
              )}
            >
              {typedTitle}
              {!titleDone && <Caret />}
            </h1>

            {description && (
              <div
                className={cn(
                  'overflow-hidden text-sm text-muted-foreground transition-all duration-200 motion-reduce:transition-none',
                  size === 'lg' && 'max-w-2xl',
                  scrolled ? 'mt-0 max-h-0 opacity-0' : 'mt-1 max-h-16 opacity-100',
                )}
              >
                {descriptionIsString ? (
                  <>
                    {typedDescription}
                    {!descriptionDone && <Caret />}
                  </>
                ) : (
                  description
                )}
              </div>
            )}
          </div>
          {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
