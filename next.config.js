

/** @type {import('next').NextConfig} */
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
  serverExternalPackages: ['firebase-admin', 'genkit', '@genkit-ai/ai', '@genkit-ai/core', '@genkit-ai/flow', '@genkit-ai/google-genai', 'node-fetch'],
  transpilePackages: ['recharts', 'd3-array', 'd3-scale', 'd3-interpolate', 'd3-format', 'd3-time', 'd3-color', 'd3-path', 'd3-shape', 'victory-vendor'],
};


module.exports = nextConfig;
