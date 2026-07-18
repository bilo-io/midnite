import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import BundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

// Bake this build's version in so the update banner (Phase 71) can compare the
// running build against the published `/version.json`. Inlined as a literal at
// build time; read from this package's own package.json (single source).
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the desktop app can serve the UI as files (only the gateway
  // runs as a process). All data is fetched client-side from the gateway.
  output: 'export',
  // No Next image-optimization server in an export.
  images: { unoptimized: true },
  // Emit dir/index.html so paths resolve when served as static files.
  trailingSlash: true,
  transpilePackages: [
    '@midnite/shared',
    '@midnite/ui',
    'yet-another-react-lightbox',
    'react-diff-view',
    'refractor',
  ],
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // Extra tree-shaking pass for barrel-file packages.
    optimizePackageImports: ['lucide-react', 'recharts', '@midnite/ui'],
  },
};

export default withBundleAnalyzer(nextConfig);
