/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  // DEV PROXY: forward /api/* to backend in development
  async rewrites() {
    return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:' + (process.env.NEXT_PUBLIC_BACKEND_PORT || '8010')}/api/:path*`
        }
    ];
  },
};

module.exports = nextConfig;