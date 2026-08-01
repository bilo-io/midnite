import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount between tests. This matters more here than usual: an unscoped
// `TableOfContents` finds its article by document query, so a leftover article
// from a previous test would be the one it scans.
afterEach(cleanup);
