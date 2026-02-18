/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010',
  },
  // DEV PROXY: forward /api/* and /admin/* to backend during local development.
  // In production on Render, components use NEXT_PUBLIC_BACKEND_URL directly.
  async rewrites() {
    const backendBase =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT || '8010'}`;
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${backendBase}/admin/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
