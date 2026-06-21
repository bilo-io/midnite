import { cn } from '@/lib/utils';
import { PANEL_CONTENT, type PanelContentKey } from '@/components/panel-content/registry';
import { PanelFrame } from './panel-frame';

/**
 * The panel, stacked inline (mobile fallback for the persistent morphing panel).
 * Hidden on md+ where the fixed <PreviewPanel> takes over.
 */
export function InlinePanel({
  content,
  className,
}: {
  content: PanelContentKey;
  className?: string;
}) {
  const { title, Component } = PANEL_CONTENT[content];
  return (
    <div className={cn('md:hidden', className)}>
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
