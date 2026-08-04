import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  GithubIcon,
  NeuroCloudBackground,
  ReadingLayout,
  TableOfContents,
} from '@midnite/ui';

import type { NavGroup } from '../content/nav';
import logoUrl from '../assets/logo.png';
import { DocSearch } from './doc-search';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';

// The app chrome — header + sidebar + content well — built entirely from the
// design tokens (and, for the theme switcher + search, library primitives). This
// is the Phase 26 proof-of-consumption: if the shell needs something the lib
// can't supply, that's a Phase 25 gap to fix, not an app-local primitive to invent.
//
// Theme D: the sidebar pins as a column on md+; below md it collapses behind a
// hamburger into a slide-in drawer (closed on navigation). Client-side search
// lives in the header (DocSearch). On xl+ an on-page TOC pins as a right rail
// (TableOfContents) — hidden on narrower viewports where it would crowd the prose.
export function Layout({ nav, children }: { nav: NavGroup[]; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes (e.g. a nav-link tap).
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // The neuro-cloud starfield backdrop (shared with the app + marketing site).
  // Animate unless the visitor prefers reduced motion — the canvas owns no motion
  // gating of its own. It reads the docs' theme tokens, so it re-tints light↔dark.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAnimate(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    // `relative isolate` + the opaque `bg-background` base lets the fixed starfield
    // pin at `-z-10` behind the whole shell while the header/sidebar/prose float over it.
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <NeuroCloudBackground animate={animate} className="fixed inset-0 -z-10" />
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src={logoUrl} alt="Midnite logo" width={28} height={28} className="h-7 w-7 rounded-lg shadow" />
            <span>
              <span className="font-brand text-lg">Midnite</span>{' '}
              <span className="font-normal text-muted-foreground">/ docs</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <DocSearch />
            <Link
              to="/getting-started"
              className="hidden items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
            >
              <Download className="h-4 w-4" />
              Download
            </Link>
            <a
              href="https://github.com/bilo-io/midnite-app"
              target="_blank"
              rel="noreferrer noopener"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {navOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur"
          />
          <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] overflow-y-auto border-r border-border bg-background p-6 shadow-lg">
            <Sidebar nav={nav} />
          </div>
        </div>
      ) : null}

      {/* The reading columns come from `@midnite/ui` (Phase 80) — the same shell the
          marketing site's legal pages read on. The grid metrics and the `xl` TOC gate
          are the primitive's defaults, lifted from this file when it was extracted, so
          the face is unchanged. The sidebar keeps its `hidden md:block` default here
          because this app surfaces its nav on mobile through the drawer above. */}
      <ReadingLayout
        sidebar={<Sidebar nav={nav} />}
        toc={<TableOfContents />}
        articleClassName="pb-16"
      >
        {children}
      </ReadingLayout>
    </div>
  );
}
