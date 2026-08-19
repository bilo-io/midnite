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

/**
 * The drag-region components from `@midnite/shell`. `TitleBar` is listed on its own
 * because a surface may satisfy the rule with the full bar instead of a bare strip —
 * matched with a word boundary so it doesn't just substring-hit
 * `<TitleBarDragStrip`.
 */
const DRAG_REGION_COMPONENTS = ['TitleBarDragStrip', 'TitleBar'] as const;

/**
 * A drag region mounted with `windowChrome={null}` (or `{undefined}`) renders
 * nothing — the component early-returns unless the bridge reports `frameless`. So the
 * bridge has to be asserted **on the mount itself**: a file-wide search for
 * `windowChrome={` passes on any other component's prop and would let exactly that
 * regression through.
 */
const mountWithLiveBridge = (name: string) =>
  new RegExp(`<${name}\\b[^>]*windowChrome=\\{(?!null|undefined)`);

describe('desktop drag regions', () => {
  for (const { file, why } of SURFACES) {
    describe(file, () => {
      // Read inside the test, not the describe body, so a renamed surface fails with
      // the message below rather than throwing during collection.
      const read = () => readFileSync(join(WEB_ROOT, file), 'utf8');

      it(`mounts a drag region fed a live bridge — ${why}`, () => {
        const source = read();
        const mounted = DRAG_REGION_COMPONENTS.filter((name) =>
          new RegExp(`<${name}\\b`).test(source),
        );
        expect(
          mounted,
          `${file} owns the whole viewport but renders no drag region, so the frameless ` +
            'window cannot be moved while it is shown. Mount <TitleBarDragStrip windowChrome={...} />.',
        ).not.toHaveLength(0);

        // ...and the mount must actually receive a bridge, or it renders null.
        expect(
          mounted.some((name) => mountWithLiveBridge(name).test(source)),
          `${file} mounts ${mounted.join('/')} but not with a live windowChrome bridge, ` +
            'so it renders nothing and the window is immovable while this surface is up.',
        ).toBe(true);
      });

      it('imports its drag region from @midnite/shell, not a local copy', () => {
        // A hand-rolled `-webkit-app-region` div would drift from the bar's height
        // and z-index; the shell owns both (TITLE_BAR_HEIGHT). Assert the drag-region
        // symbol is in the import list — the file imports plenty else from `shell`.
        const source = read();
        const imported = DRAG_REGION_COMPONENTS.some((name) =>
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from '@midnite/shell'`, 's').test(source),
        );
        expect(imported, `${file} should import its drag region from '@midnite/shell'`).toBe(true);
      });
    });
  }
});
