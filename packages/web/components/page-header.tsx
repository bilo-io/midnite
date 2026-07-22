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
import { cn } from '@/lib/utils';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
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
  actions?: ReactNode; // right-aligned controls (e.g. a search bar)
};

// Detail views no longer carry a back affordance in the header (Phase 81
// follow-up): the desktop title bar owns history nav, and in a browser the
// browser's own back button covers it. Loading/not-found states keep their
// standalone `BackLink`s (there is no header on those).
export function PageHeader({
  title,
  titleNode,
  description,
  icon,
  size = 'default',
  actions,
}: PageHeaderProps) {
  const scrolled = useScrolled();
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
        // The collapsed form is EXACTLY the title bar's height (48px content;
        // its border-b rides within the -1px sticky tuck), an invariant two
        // things depend on: (1) in the frameless desktop window the collapsed
        // header hides completely behind the fixed 48px title bar; (2) sticky
        // toolbars below the header use one offset — `top-12` — that lands
        // flush under the collapsed header in a browser AND under the title
        // bar on desktop. Change one height and the other must follow.
        'sticky top-[-1px] z-30 border-b transition-colors duration-200 motion-reduce:transition-none',
        scrolled
          ? 'border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
          : 'border-transparent bg-transparent',
      )}
    >
      {/* re-center content to align with the page body's container below */}
      <div
        className={cn(
          'container relative transition-[padding] duration-200 motion-reduce:transition-none',
          scrolled ? 'flex h-12 flex-col justify-center py-0' : 'py-6',
        )}
      >
        {/* The decorative backdrop is now app-wide (`<AppBackdrop/>`), showing
            the starfield (or the chosen pattern) through this transparent header
            — no per-header pattern strip needed. */}

        {/* Wrap (not overflow) on a phone: if the title + actions can't share a
            row, the actions drop to the next line rather than pushing past the
            viewport. No effect at desktop widths, where they always fit. */}
        <div
          className={cn(
            'flex justify-between gap-x-4',
            scrolled ? 'flex-nowrap items-center' : 'flex-wrap items-start gap-y-2',
          )}
        >
          <div className="min-w-0 flex-1">
            <h1
              // The title types out character-by-character, so `typedTitle` is empty on
              // first paint (axe `empty-heading`). aria-label exposes the full title to
              // AT immediately and stably; the animated text below is decorative.
              aria-label={title}
              className={cn(
                'flex items-center gap-2.5 font-semibold tracking-tight transition-all duration-200 motion-reduce:transition-none',
                // Both sizes collapse to text-xl inside the fixed 48px form.
                scrolled ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl',
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
          {actions ? <div className={cn('min-w-0 shrink-0', !scrolled && 'pt-0.5')}>{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
