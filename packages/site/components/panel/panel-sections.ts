import type { PanelContentKey } from '@/components/panel-content/registry';

export type PanelPlacement = 'hero' | 'right' | 'left' | 'hidden';

export type PanelSection = {
  /** Section DOM id (also the IntersectionObserver key). */
  id: string;
  /** Where the persistent panel sits when this section is active. */
  placement: PanelPlacement;
  /** Which content module fills the panel here. */
  content: PanelContentKey;
};

// Drives the persistent panel's target rect + content per section, and the set of
// ids the scroll controller observes. Document order. `hidden` fades the panel out
// (e.g. the download CTA section has its own visual language).
export const PANEL_SECTIONS: PanelSection[] = [
  { id: 'top', placement: 'hero', content: 'terminal' },
  { id: 'how', placement: 'right', content: 'kanban' },
  { id: 'features', placement: 'left', content: 'session' },
  { id: 'cli', placement: 'right', content: 'terminal' },
  { id: 'download', placement: 'hidden', content: 'terminal' },
];

export const PANEL_SECTION_IDS: string[] = PANEL_SECTIONS.map((s) => s.id);

export function getPanelSection(id: string | null | undefined): PanelSection | undefined {
  if (!id) return undefined;
  return PANEL_SECTIONS.find((s) => s.id === id);
}
