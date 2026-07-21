'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  ChevronDown,
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
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Collapse } from '@/components/ui/collapse';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

// `key` is the stable i18n key (settings.groups.* / settings.items.*) — also the
// collapse-set identity — while the displayed label is translated at render.
type NavItem = { href: string; key: string; Icon: LucideIcon };
type NavGroup = { key: string; items: NavItem[] };

/** Groups sorted by UX priority; items within each group sorted alphabetically. */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'general',
    items: [
      { href: '/settings', key: 'appearance', Icon: Palette },
      { href: '/settings/system', key: 'system', Icon: SlidersHorizontal },
    ],
  },
  {
    key: 'workspace',
    items: [
      { href: '/settings/agents', key: 'agents', Icon: Bot },
      { href: '/settings/api-tokens', key: 'apiTokens', Icon: Ticket },
      { href: '/settings/data', key: 'data', Icon: Database },
      { href: '/settings/editor', key: 'editor', Icon: FileEdit },
      { href: '/settings/integrations', key: 'integrations', Icon: Webhook },
      { href: '/settings/repos', key: 'repos', Icon: FolderGit2 },
    ],
  },
  {
    key: 'security',
    items: [
      { href: '/settings/safety', key: 'safety', Icon: ShieldCheck },
      { href: '/settings/credentials', key: 'credentials', Icon: KeyRound },
      { href: '/settings/screen-lock', key: 'screenLock', Icon: Lock },
      { href: '/settings/security', key: 'security', Icon: ShieldAlert },
    ],
  },
];

function NavLink({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
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
  const t = useTranslations('settings');
  const [collapsed, setCollapsed] = useLocalStorage<string[]>(COLLAPSED_GROUPS_KEY, []);
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <>
      {/* Mobile: flat horizontal scroll, no group headers */}
      <nav
        aria-label="Settings categories"
        className="flex gap-1 overflow-x-auto pb-1 md:hidden"
      >
        {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
          <NavLink key={item.href} href={item.href} label={t(`items.${item.key}`)} Icon={item.Icon} />
        ))}
      </nav>

      {/* Desktop: grouped vertical sidebar */}
      <nav
        aria-label="Settings categories"
        data-tour="settings-nav"
        className="hidden md:sticky md:top-24 md:flex md:w-48 md:shrink-0 md:flex-col md:gap-5"
      >
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed.includes(group.key);
          const bodyId = `settings-group-${group.key}`;
          const groupTitle = t(`groups.${group.key}`);
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                <ChevronDown
                  aria-hidden
                  className={cn('h-3 w-3 shrink-0 transition-transform', isCollapsed && '-rotate-90')}
                />
                <span>{groupTitle}</span>
              </button>
              <Collapse open={!isCollapsed} id={bodyId} role="group" aria-label={groupTitle}>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} href={item.href} label={t(`items.${item.key}`)} Icon={item.Icon} />
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
