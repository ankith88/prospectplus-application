

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  serverExternalPackages: ['firebase-admin', 'genkit', '@genkit-ai/google-genai'],
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/flutter_app/**', '**/node_modules/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
