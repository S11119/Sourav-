/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Arena preview proxies the dev server, so allow any origin in dev.
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', 'localhost'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
