import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { NavGroup } from '../content/nav';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';

// The app chrome — header + sidebar + content well — built entirely from the
// design tokens (and, for the theme switcher, a library primitive). This is the
// Phase 26 proof-of-consumption: if the shell needs something the lib can't
// supply, that's a Phase 25 gap to fix, not an app-local primitive to invent.
export function Layout({ nav, children }: { nav: NavGroup[]; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="font-semibold tracking-tight">
            midnite <span className="font-normal text-muted-foreground">/ docs</span>
          </Link>
          <a
            href="https://github.com/bilo-io/midnite"
            className="ml-auto hidden text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
        <Sidebar nav={nav} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
