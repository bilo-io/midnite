'use client';

import type { ReactNode } from 'react';
import {
  ActivitySquare,
  Bot,
  BotMessageSquare,
  Brain,
  BrainCircuit,
  Building2,
  CalendarClock,
  CirclePile,
  Folder,
  Images,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Newspaper,
  Presentation,
  Search,
  Settings,
  UserRound,
  Workflow,
} from 'lucide-react';
import { DynamicBackground } from '@/components/dynamic-background';
import { cn } from '@/lib/utils';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { useBackgroundPattern } from '@/lib/use-background-pattern';
import { useScrolled } from '@/lib/use-scrolled';
import { useTypewriter } from '@/lib/use-typewriter';

// Icon names that can be passed as a plain string across the server→client
// boundary. Adding an icon here: import it above and add an entry below.
const ICONS = {
  ActivitySquare,
  Bot,
  BotMessageSquare,
  Brain,
  BrainCircuit,
  Building2,
  CalendarClock,
  CirclePile,
  Folder,
  Images,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Newspaper,
  Presentation,
  Search,
  Settings,
  UserRound,
  Workflow,
} as const;

export type PageHeaderIcon = keyof typeof ICONS;

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
  /**
   * Custom title content rendered in place of the animated text (e.g. an
   * inline-editable breadcrumb). `title` is still required — it names the heading
   * for assistive tech and the document title.
   */
  titleNode?: ReactNode;
  description?: ReactNode;
  /** Icon name — resolved client-side so it can be passed from a Server Component. */
  icon?: PageHeaderIcon;
  size?: 'default' | 'lg'; // dashboard uses 'lg'
  showGrid?: boolean; // dashboard's decorative bg-grid
  actions?: ReactNode; // right-aligned controls (e.g. a search bar)
};

export function PageHeader({
  title,
  titleNode,
  description,
  icon,
  size = 'default',
  showGrid = false,
  actions,
}: PageHeaderProps) {
  const scrolled = useScrolled();
  const { pattern, className: patternClass, dynamic } = useBackgroundPattern();
  const Icon = icon ? ICONS[icon] : null;

  // Type the title and subtitle out together. Both run over the same duration so
  // they finish simultaneously regardless of length. Only string descriptions
  // can be typed; anything richer (ReactNode) renders immediately. The typewriter
  // is gated by the motion + effects settings (Phase 39 D).
  const { typewriter } = useAnimationPrefs();
  const { typed: typedTitle, done: titleDone } = useTypewriter(title, { enabled: typewriter });
  const descriptionIsString = typeof description === 'string';
  const { typed: typedDescription, done: descriptionDone } = useTypewriter(descriptionIsString ? description : '', {
    enabled: descriptionIsString && typewriter,
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
            // The dynamic canvas replaces the static pattern — keep the wrapper
            // (positioning + scroll fade) but drop the class and data-bg-target
            // so the pre-paint CSS doesn't paint underneath the canvas.
            data-bg-target={dynamic ? undefined : ''}
            className={cn(
              !dynamic && patternClass,
              'pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 transition-opacity duration-300 motion-reduce:transition-none',
              scrolled ? 'opacity-0' : 'opacity-50',
            )}
          >
            {dynamic && <DynamicBackground pattern={pattern} />}
          </div>
        )}

        {/* Wrap (not overflow) on a phone: if the title + actions can't share a
            row, the actions drop to the next line rather than pushing past the
            viewport. No effect at desktop widths, where they always fit. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <h1
              // The title types out character-by-character, so `typedTitle` is empty on
              // first paint (axe `empty-heading`). aria-label exposes the full title to
              // AT immediately and stably; the animated text below is decorative.
              aria-label={title}
              className={cn(
                'flex items-center gap-2.5 font-semibold tracking-tight transition-all duration-200 motion-reduce:transition-none',
                size === 'lg' ? (scrolled ? 'text-2xl' : 'text-3xl') : scrolled ? 'text-xl' : 'text-2xl',
              )}
            >
              {Icon && (
                <Icon className="h-[1em] w-[1em] shrink-0 text-muted-foreground" />
              )}
              {titleNode ?? (
                <span aria-hidden>
                  {typedTitle}
                  {!titleDone && <Caret />}
                </span>
              )}
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
          {actions ? <div className="min-w-0 shrink-0 pt-0.5">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
