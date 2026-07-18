'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  ChevronDown,
  CircleUser,
  Database,
  FileEdit,
  FolderGit2,
  KeyRound,
  Lock,
  Palette,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  Users,
  UserRound,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { Collapse } from '@/components/ui/collapse';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; Icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

/** Groups sorted by UX priority; items within each group sorted alphabetically. */
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'General',
    items: [
      { href: '/settings', label: 'Appearance', Icon: Palette },
      { href: '/settings/system', label: 'System', Icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { href: '/settings/agents', label: 'Agents', Icon: Bot },
      { href: '/settings/data', label: 'Data', Icon: Database },
      { href: '/settings/editor', label: 'Editor', Icon: FileEdit },
      { href: '/settings/repos', label: 'Repos', Icon: FolderGit2 },
      { href: '/settings/integrations', label: 'Integrations', Icon: Webhook },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/settings/api-tokens', label: 'API Tokens', Icon: Ticket },
      { href: '/settings/profile', label: 'Profile', Icon: CircleUser },
      { href: '/settings/team', label: 'Team', Icon: Users },
      { href: '/settings/user', label: 'User', Icon: UserRound },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/settings/safety', label: 'Safety', Icon: ShieldCheck },
      { href: '/settings/credentials', label: 'Credentials', Icon: KeyRound },
      { href: '/settings/screen-lock', label: 'Screen lock', Icon: Lock },
      { href: '/settings/security', label: 'Security', Icon: ShieldAlert },
    ],
  },
];

function NavLink({ href, label, Icon }: NavItem) {
  const pathname = usePathname();
  const active = href === '/settings' ? pathname === '/settings' : pathname.startsWith(href);
  return (
    <Link
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
}

const COLLAPSED_GROUPS_KEY = 'midnite.settings.collapsedGroups';

/**
 * Left-hand category switcher for the settings hub. A flat scrollable row on
 * small screens; a grouped sticky sidebar on desktop whose category headers are
 * collapsible accordions (with a `Collapse` transition), mirroring the main
 * sidenav. The collapsed set is persisted to localStorage.
 */
export function SettingsSidebar() {
  const [collapsed, setCollapsed] = useLocalStorage<string[]>(COLLAPSED_GROUPS_KEY, []);
  const toggleGroup = (title: string) =>
    setCollapsed((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );

  return (
    <>
      {/* Mobile: flat horizontal scroll, no group headers */}
      <nav
        aria-label="Settings categories"
        className="flex gap-1 overflow-x-auto pb-1 md:hidden"
      >
        {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Desktop: grouped vertical sidebar */}
      <nav
        aria-label="Settings categories"
        data-tour="settings-nav"
        className="hidden md:sticky md:top-24 md:flex md:w-48 md:shrink-0 md:flex-col md:gap-5"
      >
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed.includes(group.title);
          const bodyId = `settings-group-${group.title}`;
          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                <ChevronDown
                  aria-hidden
                  className={cn('h-3 w-3 shrink-0 transition-transform', isCollapsed && '-rotate-90')}
                />
                <span>{group.title}</span>
              </button>
              <Collapse open={!isCollapsed} id={bodyId} role="group" aria-label={group.title}>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} {...item} />
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </nav>
    </>
  );
}
