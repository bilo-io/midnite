import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AppWindow,
  BarChart3,
  BookOpen,
  Bug,
  FileClock,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Rocket,
  ScrollText,
  SquareArrowOutUpRight,
  Tag,
  Users,
} from 'lucide-react';
import { Card, GithubIcon } from '@midnite/ui';
import {
  APP_URL,
  DOCS_URL,
  GITHUB_RELEASES_URL,
  PUBLIC_GITHUB_REPO,
  docsChangelogUrl,
  githubIssuesNewUrl,
} from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { ADMIN_NAV, type AdminNavId } from '@/lib/nav-config';

/**
 * Quick Links (Phase 73 Theme F). A launcher: outbound cards to the docs, the
 * public GitHub repo, releases, the changelog, and a prefilled bug report (all via
 * `@midnite/shared` site-links) plus in-app deep links to every operator surface
 * (`ADMIN_NAV`). External links open in a new tab with `rel="noopener noreferrer"`.
 */

type ExternalLink = {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const EXTERNAL_LINKS: readonly ExternalLink[] = [
  {
    label: 'Web app',
    description: 'The task board — open the main midnite web app.',
    href: APP_URL,
    icon: <AppWindow aria-hidden />,
  },
  {
    label: 'Documentation',
    description: 'Guides, the design system, and developer docs.',
    href: DOCS_URL,
    icon: <BookOpen aria-hidden />,
  },
  {
    label: 'Changelog',
    description: 'Every released version and its notes.',
    href: docsChangelogUrl(),
    icon: <FileClock aria-hidden />,
  },
  {
    label: 'GitHub',
    description: 'The public companion repo — source-of-truth for releases + issues.',
    href: `https://github.com/${PUBLIC_GITHUB_REPO}`,
    icon: <GithubIcon aria-hidden />,
  },
  {
    label: 'Releases & downloads',
    description: 'Tagged releases and the desktop installers.',
    href: GITHUB_RELEASES_URL,
    icon: <Rocket aria-hidden />,
  },
  {
    label: 'Report an issue',
    description: 'Open a prefilled bug report on GitHub.',
    href: githubIssuesNewUrl({ title: '', body: '' }),
    icon: <Bug aria-hidden />,
  },
];

const NAV_ICON: Record<AdminNavId, ReactNode> = {
  overview: <LayoutDashboard aria-hidden />,
  usage: <BarChart3 aria-hidden />,
  users: <Users aria-hidden />,
  projects: <FolderKanban aria-hidden />,
  versions: <Tag aria-hidden />,
  audit: <ScrollText aria-hidden />,
  links: <Link2 aria-hidden />,
};

const NAV_DESCRIPTION: Record<AdminNavId, string> = {
  overview: 'Platform KPIs at a glance.',
  usage: 'LLM spend and fleet throughput.',
  users: 'Every user and team on the platform.',
  projects: 'The cross-tenant project registry.',
  versions: 'Running build, channels, and the changelog.',
  audit: 'Every recorded platform action.',
  links: 'This launcher.',
};

function LinkCard({ icon, label, description }: { icon: ReactNode; label: string; description: string }) {
  return (
    <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:bg-accent/40">
      <span className="mt-0.5 text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Card>
  );
}

export default function LinksPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Links"
        description="Jump out to the docs and GitHub, or deep-link into any operator surface."
      />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SquareArrowOutUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          External
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXTERNAL_LINKS.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="block">
              <LinkCard icon={link.icon} label={link.label} description={link.description} />
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          In-app
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_NAV.filter((entry) => entry.id !== 'links').map((entry) => (
            <Link key={entry.id} href={entry.href} className="block">
              <LinkCard
                icon={NAV_ICON[entry.id]}
                label={entry.label}
                description={NAV_DESCRIPTION[entry.id]}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
