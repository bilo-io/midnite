import { useMemo } from 'react';
import {
  CloudRain,
  Lightbulb,
  Microscope,
  Rocket,
  ShieldAlert,
  SlidersHorizontal,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { COUNCIL_FORMATS, COUNCIL_FORMATS_META, type CouncilFormat } from '@midnite/shared';
import type { SelectOption } from '@/components/ui/select';
import { useCouncilFormatLabels } from '@/lib/council-format-labels';

// `shared` is UI-library-free, so each format carries a string `iconKey`; the web
// maps it to a concrete lucide icon here. Keep this table in sync with the keys in
// COUNCIL_FORMATS_META (shared/src/council.ts).
const FORMAT_ICON: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  swords: Swords,
  microscope: Microscope,
  'shield-alert': ShieldAlert,
  rocket: Rocket,
  'cloud-rain': CloudRain,
  sliders: SlidersHorizontal,
};

/** The lucide icon for a format, falling back to the custom-prompt sliders glyph. */
export function formatIcon(format: CouncilFormat): LucideIcon {
  return FORMAT_ICON[COUNCIL_FORMATS_META[format].iconKey] ?? SlidersHorizontal;
}

/**
 * Format options for a {@link StyledSelect}: value + translated label + the
 * format's icon. A hook rather than a module constant (Phase 82 Theme D) because
 * the label now resolves against the active locale — see
 * {@link useCouncilFormatLabels} for why the English stays canonical in `shared`.
 */
export function useFormatSelectOptions(): ReadonlyArray<SelectOption<CouncilFormat>> {
  const formats = useCouncilFormatLabels();
  return useMemo(
    () =>
      COUNCIL_FORMATS.map((f) => {
        const Icon = formatIcon(f);
        return {
          value: f,
          label: formats.label(f),
          icon: <Icon className="h-3.5 w-3.5" />,
        };
      }),
    [formats],
  );
}
