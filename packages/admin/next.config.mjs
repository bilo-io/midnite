import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Bake this build's version in (mirrors web) so the shell/version chips can read
// it. Inlined as a literal at build time from this package's own package.json.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Admin is a client-only static bundle (never packaged into desktop); the
  // gateway is the only process it talks to (over HTTP).
  output: 'export',
  // No Next image-optimization server in an export.
  images: { unoptimized: true },
  // Emit dir/index.html so paths resolve when served as static files.
  trailingSlash: true,
  transpilePackages: ['@midnite/shared', '@midnite/ui', '@midnite/shell'],
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // Extra tree-shaking pass for barrel-file packages.
    optimizePackageImports: ['lucide-react', '@midnite/ui'],
  },
};

export default nextConfig;
