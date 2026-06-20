'use client';

import {
  Beer,
  Boxes,
  Download,
  ExternalLink,
  Hexagon,
  Loader2,
  Moon,
  RefreshCw,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  meetsMinVersion,
  type EnvToolAction,
  type EnvToolId,
  type EnvToolMeta,
  type EnvToolStatus,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';

// Placeholder brand icons — swap for real SVGs under /public later.
const TOOL_ICON: Record<EnvToolId, LucideIcon> = {
  homebrew: Beer,
  node: Hexagon,
  proto: Boxes,
  moon: Moon,
};

const DOT_OK = 'hsl(142 71% 45%)';
const DOT_WARN = 'hsl(38 92% 50%)';
const DOT_BAD = 'hsl(0 72% 55%)';

/**
 * One system tool row: icon, label, required version, a status dot (green = ok,
 * amber = installed-but-below-minimum, red = missing) and install/update/
 * uninstall actions. While `loading` it shows a spinner; on the detected OS it's
 * `live` (real status + working actions); on other OS tabs it's reference-only.
 */
export function EnvToolCard({
  meta,
  status,
  loading,
  live,
  onAction,
}: {
  meta: EnvToolMeta;
  status: EnvToolStatus | undefined;
  loading: boolean;
  live: boolean;
  onAction: (action: EnvToolAction) => void;
}) {
  const Icon = TOOL_ICON[meta.id];
  const installed = status?.installed ?? false;
  const version = status?.version;
  const ok = installed && meetsMinVersion(version, meta.minVersion);
  const outdated = installed && !ok;
  const dot = ok ? DOT_OK : outdated ? DOT_WARN : DOT_BAD;

  return (
    <section className="rounded-lg border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{meta.label}</span>
        {meta.minVersion ? (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">
            ≥ {meta.minVersion}
          </span>
        ) : null}

        {loading ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            checking…
          </span>
        ) : live ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
            {installed ? (
              <>
                {version ? <span className="truncate font-mono">{version}</span> : 'installed'}
                {outdated ? <span style={{ color: DOT_WARN }}>· update needed</span> : null}
              </>
            ) : (
              'not installed'
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {loading ? null : live ? (
            <>
              {installed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction('uninstall')}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Uninstall
                </Button>
              ) : null}
              {installed ? (
                <Button
                  type="button"
                  variant={outdated ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAction('update')}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update
                </Button>
              ) : (
                <Button type="button" variant="default" size="sm" onClick={() => onAction('install')}>
                  <Download className="h-3.5 w-3.5" />
                  Install
                </Button>
              )}
            </>
          ) : (
            <a
              href={meta.homepageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Docs
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
        {meta.description}
        {meta.via ? ` · installed via ${meta.via}` : ''}
      </div>
    </section>
  );
}
