'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { LEGAL_DOCS } from '@/lib/legal';

/**
 * Sidebar listing every legal doc with active-link highlighting. On md+ it's a
 * vertical rail; on mobile it collapses to a horizontal, scrollable selector row
 * above the content.
 */
export function LegalSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Legal documents"
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0"
    >
      <p className="hidden px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:block">
        Legal
      </p>
      {LEGAL_DOCS.map((doc) => {
        const href = `/legal/${doc.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={doc.slug}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {doc.title}
          </Link>
        );
      })}
    </nav>
  );
}
