/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve the install one-liner (public/install.sh) as inspectable plain text —
  // so `curl https://midnite-app.vercel.app/install.sh` (or opening it in a
  // browser) shows the script instead of downloading it, letting people read it
  // before piping to `sh`. `curl | sh` ignores content-type, so this is purely a
  // human-friendliness/trust touch.
  async headers() {
    return [
      {
        source: '/install.sh',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
    ];
  },
};

export default nextConfig;
