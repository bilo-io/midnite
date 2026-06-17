/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the desktop app can serve the UI as files (only the gateway
  // runs as a process). All data is fetched client-side from the gateway.
  output: 'export',
  // No Next image-optimization server in an export.
  images: { unoptimized: true },
  // Emit dir/index.html so paths resolve when served as static files.
  trailingSlash: true,
  transpilePackages: ['@midnite/shared', 'yet-another-react-lightbox'],
  reactStrictMode: true,
};

export default nextConfig;
