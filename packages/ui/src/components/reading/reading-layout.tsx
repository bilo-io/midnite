import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { READING_ARTICLE_ATTR } from './table-of-contents';

export type ReadingLayoutProps = {
  /** Left column (each app's own nav — docs' grouped accordion, legal's flat list). */
  sidebar?: ReactNode;
  /**
   * What the sidebar does below `md`:
   * - `'hidden'` (default) — the host surfaces its nav some other way (docs puts it
   *   behind a hamburger drawer), so the column would only duplicate it.
   * - `'inline'` — the sidebar stacks above the article and stays reachable. Use it
   *   when the sidebar *is* the only navigation, as on the site's legal pages, where
   *   hiding it would strand a phone reader on whichever doc they landed on.
   */
  sidebarMobile?: 'hidden' | 'inline';
  /** Right rail, typically a {@link TableOfContents}. Hidden below `xl`. */
  toc?: ReactNode;
  /** The article body — rendered markdown/MDX, usually wrapped in `Prose`. */
  children: ReactNode;
  /** Outer wrapper classes (the max-width + padding shell). */
  className?: string;
  /** Sidebar column classes, e.g. to make it sticky. */
  sidebarClassName?: string;
  /** Article classes, for a consumer that wants a different measure. */
  articleClassName?: string;
};

/**
 * The reading-column shell: an optional left sidebar, a measured centre article,
 * and an optional right TOC rail that appears at `xl` (below that it would crowd
 * the prose). Stateless and router-free — slots arrive as props, so it renders on
 * the server in the Next site and in Vite/react-router docs alike.
 *
 * The article carries {@link READING_ARTICLE_ATTR}, which is how an unscoped
 * `TableOfContents` finds the headings to scan without any ref wiring.
 */
export function ReadingLayout({
  sidebar,
  sidebarMobile = 'hidden',
  toc,
  children,
  className,
  sidebarClassName,
  articleClassName,
}: ReadingLayoutProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6',
        sidebar && 'md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12',
        sidebar && toc && 'xl:grid-cols-[13rem_minmax(0,1fr)_14rem]',
        !sidebar && toc && 'xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12',
        className,
      )}
    >
      {sidebar ? (
        <div
          className={cn(sidebarMobile === 'hidden' && 'hidden md:block', sidebarClassName)}
        >
          {sidebar}
        </div>
      ) : null}

      <main className="min-w-0">
        <article {...{ [READING_ARTICLE_ATTR]: '' }} className={cn('max-w-3xl', articleClassName)}>
          {children}
        </article>
      </main>

      {toc ? (
        <aside className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">{toc}</div>
        </aside>
      ) : null}
    </div>
  );
}
