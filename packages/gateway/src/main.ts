import { startGateway } from './bootstrap';

startGateway().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[midnite gateway] failed to start', err);
  process.exit(1);
});
