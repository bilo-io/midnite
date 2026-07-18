import Image from 'next/image';
import Link from 'next/link';
import { GitBranch } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { DOCS_URL, GITHUB_URL } from '@/lib/site';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#cli', label: 'CLI' },
  { href: '/download', label: 'Download' },
  { href: DOCS_URL, label: 'Docs', external: true },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <nav className="container flex h-14 items-center justify-between">
        <Link href="#top" className="flex items-center gap-2 tracking-tight">
          <Image
            src="/logo.PNG"
            alt="midnite logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg shadow"
            priority
          />
          <span className="font-cassandra text-xl leading-none">midnite</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : l.href.startsWith('/') ? (
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

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <GitBranch className="h-4 w-4" />
          </a>
        </div>
      </nav>
    </header>
  );
}
