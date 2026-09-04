/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    // Lint runs separately via `pnpm lint`; ESLint 9 flat config is not
    // compatible with next build's internal legacy lint invocation.
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@molemisi/shared',
    '@molemisi/game-types',
    '@molemisi/game-config',
    '@molemisi/validation',
  ],
  webpack: (config) => {
    config.resolve.alias['@/game'] = path.resolve(__dirname, '../game/src');
    return config;
  },
};

module.exports = nextConfig;
