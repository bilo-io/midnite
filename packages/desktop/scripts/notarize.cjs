'use strict';

const { notarize } = require('@electron/notarize');

/**
 * electron-builder afterSign hook (Phase 71 Theme E). Notarizes the signed macOS
 * .app so electron-updater will accept the downloaded artifact and Gatekeeper lets
 * it launch without a warning.
 *
 * **Env-gated + fail-soft:** only runs on macOS and only when all three Apple
 * credentials are present — APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID.
 * Absent (local dev, or CI before secrets are configured) → it logs and returns,
 * so an unsigned/un-notarized build still succeeds. Notarization also requires a
 * real Developer ID signature (CSC_LINK); an unsigned .app can't be notarized, so
 * the guard keeps those builds green.
 */
exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  if (!appleId || !appleIdPassword || !teamId) {
    // eslint-disable-next-line no-console
    console.log('[notarize] skipped — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not all set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  // eslint-disable-next-line no-console
  console.log(`[notarize] notarizing ${appName}.app …`);

  await notarize({
    appBundleId: context.packager.appInfo.id,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });

  // eslint-disable-next-line no-console
  console.log(`[notarize] done: ${appName}.app`);
};
