import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, GitBranch } from 'lucide-react';
import { NeuroCloudBackground } from '@midnite/ui';

import type { NavGroup } from '../content/nav';
import logoUrl from '../assets/logo.png';
import { DocSearch } from './doc-search';
import { Sidebar } from './sidebar';
import { TableOfContents } from './table-of-contents';
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
            <img src={logoUrl} alt="midnite logo" width={28} height={28} className="h-7 w-7 rounded-lg shadow" />
            <span>
              midnite <span className="font-normal text-muted-foreground">/ docs</span>
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
              <GitBranch className="h-4 w-4" />
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

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12 xl:grid-cols-[13rem_minmax(0,1fr)_14rem]">
        <div className="hidden md:block">
          <Sidebar nav={nav} />
        </div>
        <main className="min-w-0">{children}</main>
        <aside className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <TableOfContents />
          </div>
        </aside>
      </div>
    </div>
  );
}
