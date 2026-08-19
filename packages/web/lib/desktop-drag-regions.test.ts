import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Phase 81 Theme E — static guard that every **persistent** full-viewport surface
 * mounts a window drag region.
 *
 * On a frameless macOS window (`titleBarStyle: 'hidden'`) the only way to move the
 * window is an app-drawn `-webkit-app-region: drag` strip. A surface that owns the
 * whole viewport and forgets one leaves the window physically immovable — a bug you
 * cannot see in a browser, cannot see in a unit test of that component, and only
 * notice by trying to drag the packaged app. So it is pinned here instead.
 *
 * **Why only these files.** Transient overlays (modals, drawers, dialogs — ~46 files
 * render `fixed inset-0`) deliberately do *not* need a strip: they sit over the bar
 * the way a native sheet sits over a native title bar, and dismissing them restores
 * dragging. The surfaces below are different — they are the app's *only* chrome for
 * as long as they are shown, so the strip has to be theirs.
 *
 * **Adding a surface.** If you add a route group layout or a full-screen takeover
 * that renders instead of (not over) the app shell, add a row here and mount a
 * `<TitleBarDragStrip>`/`<TitleBar>` in it.
 */

const WEB_ROOT = join(__dirname, '..');

/** The persistent full-viewport surfaces and what makes each one load-bearing. */
const SURFACES = [
  {
    file: 'components/app-shell-client.tsx',
    why: 'the app shell — every in-app route (board, task detail, settings) renders inside it',
  },
  {
    file: 'app/(auth)/layout.tsx',
    why: 'the login / auth split-screen, which renders instead of the app shell',
  },
  {
    file: 'components/screensaver.tsx',
    why: 'the lock screen / screensaver, a full-viewport takeover over everything else',
  },
] as const;

/** Either drag-region export from `@midnite/shell` satisfies the requirement. */
const DRAG_REGION_COMPONENTS = ['TitleBarDragStrip', 'TitleBar'] as const;

describe('desktop drag regions', () => {
  for (const { file, why } of SURFACES) {
    describe(file, () => {
      const source = readFileSync(join(WEB_ROOT, file), 'utf8');

      it(`mounts a drag region — ${why}`, () => {
        const mounted = DRAG_REGION_COMPONENTS.filter((name) => source.includes(`<${name}`));
        expect(
          mounted,
          `${file} owns the whole viewport but renders no drag region, so the frameless ` +
            'window cannot be moved while it is shown. Mount <TitleBarDragStrip windowChrome={...} />.',
        ).not.toHaveLength(0);
      });

      it('imports its drag region from @midnite/shell, not a local copy', () => {
        // A hand-rolled `-webkit-app-region` div would drift from the bar's height
        // and z-index; the shell owns both (TITLE_BAR_HEIGHT).
        expect(source).toMatch(/from '@midnite\/shell'/);
      });

      it('feeds the drag region a windowChrome bridge', () => {
        // Without the bridge the component renders null unconditionally, so the
        // mount above would be decorative.
        expect(source).toMatch(/windowChrome=\{/);
      });
    });
  }
});
