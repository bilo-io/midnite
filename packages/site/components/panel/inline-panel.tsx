'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { PANEL_CONTENT, type PanelContentKey } from '@/components/panel-content/registry';
import { PanelFrame } from './panel-frame';

// Mount below `lg` — the fixed <PreviewPanel> owns ≥ lg (desktop), where there's
// room for the section content and the panel side-by-side. At tablet widths the
// panel is proportionally too large to sit beside content, so it stacks inline
// here. Gating in JS (not just `hidden lg:block`) keeps the content modules'
// timers/animations from running while invisible on desktop.
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return mobile;
}

/**
 * The panel, stacked inline (the mobile fallback for the persistent morphing panel).
 */
export function InlinePanel({
  content,
  className,
}: {
  content: PanelContentKey;
  className?: string;
}) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  const { title, Component } = PANEL_CONTENT[content];
  return (
    <div className={cn('lg:hidden', className)}>
      <div className="aspect-[4/3] w-full max-w-md">
        <PanelFrame title={title}>
          <div className="absolute inset-0">
            <Component />
          </div>
        </PanelFrame>
      </div>
    </div>
  );
}
