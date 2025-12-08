
/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default;

const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mailplus.com.au',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
