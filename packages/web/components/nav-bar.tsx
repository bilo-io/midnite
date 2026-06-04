'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Columns3,
  Folder,
  LayoutDashboard,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: Folder },
  { href: '/tasks', label: 'Tasks', Icon: Columns3 },
  { href: '/sessions', label: 'Sessions', Icon: MessagesSquare },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center border-r border-border/60 bg-background/70 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <Link
        href="/"
        aria-label="midnite"
        className="group relative mb-4 flex h-9 w-9 items-center justify-center"
      >
        <Image
          src="/logo.PNG"
          alt="midnite"
          width={36}
          height={36}
          priority
          className="h-9 w-9 rounded-full object-cover ring-1 ring-border/60 transition-transform group-hover:scale-110"
        />
        <Tooltip>midnite</Tooltip>
      </Link>

      <nav className="flex flex-col items-center gap-1">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                'group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <Tooltip>{label}</Tooltip>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}
