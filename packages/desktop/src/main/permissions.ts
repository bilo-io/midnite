import type { Session } from 'electron';

/**
 * Permissions the app itself actually uses. Everything else is denied.
 *
 * `geolocation` is here for the dashboard weather widget. Electron reaches the
 * renderer's `navigator.geolocation` only if a permission handler says yes —
 * and on macOS the app additionally needs `NSLocationWhenInUseUsageDescription`
 * plus the location entitlement (both set in `electron-builder.yml` /
 * `resources/entitlements.mac.plist`) for the OS to hand back a fix. Without all
 * three, `getCurrentPosition` dead-ends in POSITION_UNAVAILABLE and the widget
 * falls through to its IP-based fallback. See bilo-io/midnite-app#2.
 */
const ALLOWED = new Set(['geolocation', 'notifications', 'clipboard-sanitized-write']);

/**
 * Whether to grant `permission` to whoever is asking.
 *
 * The app never navigates off its own origin (external links go to the system
 * browser via the window-open handler), so an ask from anywhere else is not the
 * app. Electron's default with no handler installed is to grant — this closes
 * that by default and opens only what's used.
 */
export function decidePermission(appOrigin: string, permission: string, requestingUrl: string | undefined): boolean {
  if (!ALLOWED.has(permission)) return false;
  if (!requestingUrl) return false;
  try {
    // Compare parsed origins, so `http://localhost:77771` can't pass as `:7777`.
    return new URL(requestingUrl).origin === new URL(appOrigin).origin;
  } catch {
    return false;
  }
}

/**
 * Install both handlers on the session. Chromium asks through
 * `setPermissionRequestHandler` when a prompt is due and through
 * `setPermissionCheckHandler` for the synchronous `permissions.query()` path —
 * geolocation consults both, so answering only one leaves it broken.
 */
export function registerPermissionHandlers(session: Session, appOrigin: string): void {
  session.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(decidePermission(appOrigin, permission, details.requestingUrl));
  });
  session.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    decidePermission(appOrigin, permission, requestingOrigin),
  );
}
