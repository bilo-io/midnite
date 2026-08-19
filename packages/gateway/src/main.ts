import { startGateway } from './bootstrap';
import { installProcessGuards } from './lib/process-guards';

// Before anything else: without these, an unhandled rejection after boot kills
// the gateway silently (Node ≥15), and in the desktop app that leaves the window
// open against a dead server. See lib/process-guards.ts.
installProcessGuards();

startGateway().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[midnite gateway] failed to start', err);
  process.exit(1);
});
