import type { ReactNode } from 'react';

/**
 * A routed operator-console page placeholder (Phase 73 Theme E scaffold). Renders
 * the page heading + a one-line "coming in Theme F" note. Theme F fills each of
 * these with real content backed by the `GET /admin/*` reads.
 */
export function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{children ?? 'Coming in Theme F.'}</p>
    </div>
  );
}
