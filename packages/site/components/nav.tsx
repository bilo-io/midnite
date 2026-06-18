import Link from 'next/link';
import { GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GITHUB_URL } from '@/lib/site';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#cli', label: 'CLI' },
  { href: '/download', label: 'Download' },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <nav className="container flex h-14 items-center justify-between">
        <Link href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] shadow-[0_0_10px_-1px_#8b5cf6]" />
          <span className="font-brand">midnite</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) =>
            l.href.startsWith('/') ? (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <GitBranch className="h-4 w-4" />
          </a>
          <a href="#cli">
            <Button size="sm">Get started</Button>
          </a>
        </div>
      </nav>
    </header>
  );
}
