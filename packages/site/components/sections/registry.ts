// The section registry — the single place that lists the landing page's scroll
// sections and their copy. Themes B (per-section particle styles) and C (the
// persistent preview panel) will read their per-section config from the same
// entries; those fields are declared here as optional and forward-looking so adding
// a section stays a one-place edit when those themes land.

/** Per-section particle look (Theme B). Forward-looking; not yet consumed. */
export type ParticleStyle = {
  /** Palette accent, as a hex or `hsl(...)` string. */
  accent: string;
  /** Relative particle density (1 = baseline). */
  density?: number;
  /** Motion character the shader lerps toward. */
  motion?: 'calm' | 'swirl' | 'grid';
};

/** Target rect for the persistent preview panel (Theme C). Forward-looking. */
export type PanelRect = { x: number; y: number; width: number; height: number };

export type SiteSection = {
  /** DOM id of the section element; also the IntersectionObserver key. */
  id: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Section title — typed out on entry (Theme D). */
  title: string;
  /** Optional subtitle — typed after the title. */
  subtitle?: string;
  particleStyle?: ParticleStyle;
  panelRect?: PanelRect;
};

export const SECTIONS: SiteSection[] = [
  {
    id: 'how',
    eyebrow: 'How it works',
    title: 'From a messy list to merged work, on autopilot.',
  },
  {
    id: 'features',
    eyebrow: 'Features',
    title: 'One gateway. Many agents. Full visibility.',
  },
  {
    id: 'cli',
    eyebrow: 'From the terminal',
    title: 'Start the gateway, dump your list, walk away.',
  },
];

/** Section ids in document order — what the controller observes. */
export const SECTION_IDS: string[] = SECTIONS.map((s) => s.id);

export function getSection(id: string): SiteSection | undefined {
  return SECTIONS.find((s) => s.id === id);
}
