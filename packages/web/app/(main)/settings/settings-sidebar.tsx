'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  FolderGit2,
  Lock,
  Palette,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = { href: string; label: string; Icon: LucideIcon };

/** The settings categories, in sidebar order. Appearance owns `/settings`. */
const CATEGORIES: Category[] = [
  { href: '/settings', label: 'Appearance', Icon: Palette },
  { href: '/settings/screen-lock', label: 'Screen lock', Icon: Lock },
  { href: '/settings/agents', label: 'Agents', Icon: Bot },
  { href: '/settings/repos', label: 'Repos', Icon: FolderGit2 },
  { href: '/settings/system', label: 'System', Icon: SlidersHorizontal },
  { href: '/settings/user', label: 'User', Icon: UserRound },
];

/**
 * Left-hand category switcher for the settings hub. A scrollable row on small
 * screens, a sticky vertical list on desktop. Appearance is the index route, so
 * it matches exactly; the rest match by prefix.
 */
export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings categories"
      className="flex gap-1 overflow-x-auto pb-1 md:sticky md:top-24 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
    >
      {CATEGORIES.map(({ href, label, Icon }) => {
        const active = href === '/settings' ? pathname === '/settings' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
