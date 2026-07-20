'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The one back affordance every detail/sub-view uses (councils, media, sessions,
 * projects, memory, tasks, …). It sits **top-left**, in the normal reading flow —
 * deliberately away from the top-right, where the fixed `HeaderActions` cluster
 * (z-50) lives — so a back control can never collide with the floating menu the
 * way the old right-aligned chips did. Rendered above the title by `PageHeader`'s
 * `back` prop, or standalone in loading/not-found fallbacks.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Link>
  );
}
