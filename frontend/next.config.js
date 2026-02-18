/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose NEXT_PUBLIC_BACKEND_URL to the browser bundle.
  // Set this to your Render backend URL in the Render dashboard env vars.
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010',
  },
};

module.exports = nextConfig;
