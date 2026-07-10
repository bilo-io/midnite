'use client';

import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { buttonVariants } from '@midnite/ui';
import { FEATURES, type FeatureKey } from '@/lib/features';
import { cn } from '@/lib/utils';

type Props = {
  /**
   * The collection the missing record belongs to. Drives the resource icon,
   * the collection name ("View {label}"), and the "View …" link target — all
   * sourced from the {@link FEATURES} registry so this stays the single source
   * of truth.
   */
  feature: FeatureKey;
  /** Singular noun for the record, e.g. `"council"` — used in the explainer. */
  singular: string;
  className?: string;
};

/**
 * The shared "resource not found" panel. Unlike a bare 404 it names the missing
 * record's type, shows an on-brand vector graphic (a magnifier scanning a card
 * that reads 404, with the collection's own icon on the card), and offers two
 * recovery routes: back to the dashboard, or to the collection listing.
 *
 * Used by every deep-link detail container (`/councils/view`, `/tasks/view`, …)
 * when a bookmarked or stale id resolves to nothing.
 */
export function ResourceNotFound({ feature, singular, className }: Props) {
  const meta = FEATURES.find((f) => f.key === feature);
  const Icon = meta?.Icon;
  const collection = meta?.label ?? 'items';
  const href = meta?.href ?? '/';
  const title = `${singular.charAt(0).toUpperCase()}${singular.slice(1)} not found`;

  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center',
        className,
      )}
    >
      {/* On-brand vector graphic: a magnifier scanning a record card that reads
          404, with the collection's own icon on the card. viewBox units map 1:1
          to the w-56/h-40 stage (both 1.4 aspect), so the overlaid icon lines up. */}
      <div className="relative mb-8 h-40 w-56">
        <div aria-hidden className="absolute inset-0 -z-10 rounded-full bg-primary/10 blur-2xl" />
        <svg
          viewBox="0 0 224 160"
          fill="none"
          role="img"
          aria-label={`${singular} not found`}
          className="h-full w-full text-muted-foreground"
        >
          {/* dashed orbit + drifting motes, echoing the empty-state language */}
          <ellipse
            cx="112"
            cy="80"
            rx="90"
            ry="60"
            className="stroke-border"
            strokeWidth="1.5"
            strokeDasharray="4 7"
          />
          <circle cx="22" cy="54" r="3" className="fill-muted-foreground/40" />
          <circle cx="204" cy="106" r="4" className="fill-primary/50" />
          <circle cx="196" cy="38" r="2.5" className="fill-muted-foreground/30" />
          <circle cx="30" cy="112" r="2.5" className="fill-muted-foreground/25" />

          {/* the record card (tilted), with a couple of skeleton lines */}
          <g transform="rotate(-6 112 78)">
            <rect
              x="70"
              y="38"
              width="84"
              height="80"
              rx="14"
              className="fill-card stroke-border"
              strokeWidth="1.5"
            />
            <rect x="84" y="96" width="40" height="7" rx="3.5" className="fill-muted-foreground/25" />
            <rect x="84" y="108" width="24" height="6" rx="3" className="fill-muted-foreground/15" />
          </g>

          {/* magnifying glass; its lens reads 404 */}
          <circle
            cx="150"
            cy="108"
            r="26"
            className="fill-background stroke-primary"
            strokeWidth="3"
          />
          <text
            x="150"
            y="114"
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            letterSpacing="-0.5"
            fontFamily="ui-monospace, monospace"
            className="fill-primary"
          >
            404
          </text>
          <line
            x1="170"
            y1="128"
            x2="188"
            y2="146"
            className="stroke-primary"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>

        {/* the collection's icon, sitting on the clear upper area of the card */}
        {Icon ? (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{ left: '48%', top: '41%', transform: 'translate(-50%, -50%)' }}
          >
            <Icon className="h-9 w-9 text-muted-foreground/70" strokeWidth={1.5} />
          </div>
        ) : null}
      </div>

      <span className="mb-2 rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 font-mono text-xs tracking-widest text-muted-foreground">
        404
      </span>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This {singular} could not be found. It may have been deleted, or the link may be incorrect.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Link href="/dashboard" className={buttonVariants({ variant: 'default' })}>
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Link>
        <Link href={href} className={buttonVariants({ variant: 'outline' })}>
          {Icon ? <Icon className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          View {collection}
        </Link>
      </div>
    </div>
  );
}
