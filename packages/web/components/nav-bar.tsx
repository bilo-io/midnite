'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/board', label: 'Board' },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-wide">midnite</span>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <span className="text-xs text-muted-foreground">Multitask Claude Code</span>
      </div>
    </header>
  );
}
