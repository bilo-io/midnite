// @midnite/shell — the wired app shell both `web` and `admin` mount (Phase 73).
//
// A mid-tier package: it may depend on `@midnite/shared` + `@midnite/ui` only
// (react/react-dom/next/react-query are peers). The leaf-visual primitives live in
// `@midnite/ui`; the data-coupled, wired frame lives here. Consumers also import
// the appearance CSS layer via the `@midnite/shell/appearance.css` subpath.

// App frame — the injected-nav shell chrome (fixed rail + mobile nav + padded main).
export {
  AppFrame,
  isActivePath,
  type AppFrameProps,
  type NavConfig,
  type NavItem,
  type NavSection,
  type NavLinkComponent,
  type RailSlot,
  type RailSlotContext,
} from './app-frame';

// Mobile bottom-tab nav — rendered internally by `AppFrame`, exported for typing.
export { AppMobileNav, type AppMobileNavProps } from './nav/mobile-nav';

// Lock screen — the reusable idle/login lock on the neuro-cloud starfield.
export { LockScreen, type LockScreenProps } from './lock/lock-screen';
export { useIdleTimer } from './lock/use-idle-timer';

// Provider composition — the app-agnostic frame-level provider stack.
export { ShellProviders, type ShellProvidersProps } from './providers/shell-providers';

// Appearance runtime — the Phase 39/68 appliers + init script (drives the CSS in
// `@midnite/shell/appearance.css`).
export {
  coerceAccentValue,
  buildAccentCssParts,
  applyAccent,
  applyAccentSecondary,
  accentGradientCss,
  applyMotion,
  applyDensity,
  applyBackground,
  applyUiFont,
  applyEffects,
  applyShimmerDirection,
  appearanceInitScript,
  type AccentCssParts,
} from './appearance/apply-appearance';

// Appearance constants (owned here; `web/lib/app-settings` re-exports them).
export {
  SETTINGS_STORAGE_KEY,
  ACCENT_OPTIONS,
  ACCENT_SWATCH_HS,
  MONO_HUE_SHIFT,
  BACKGROUND_PATTERN_OPTIONS,
  DEFAULT_EFFECTS,
  UI_FONT_STACK,
  BG_INTENSITY_DEFAULT,
  BACKGROUND_PATTERN_DEFAULT,
  BRAND_ACCENT,
} from './appearance/constants';
