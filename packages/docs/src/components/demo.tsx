import type { ReactNode } from 'react';

// A framed live preview used inside the component MDX pages: the real
// @midnite/ui primitive renders here against the design tokens, so a reader sees
// it in the current theme rather than a static screenshot. Imported by MDX pages.
export function Demo({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-6">
      {children}
    </div>
  );
}
