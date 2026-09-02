/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  transpilePackages: [
    '@molemisi/shared',
    '@molemisi/game-types',
    '@molemisi/game-config',
    '@molemisi/validation',
  ],
  experimental: {
    serverActions: true,
  },
  webpack: (config) => {
    config.resolve.alias['@/game'] = path.resolve(__dirname, '../game/src');
    return config;
  },
};

module.exports = nextConfig;
