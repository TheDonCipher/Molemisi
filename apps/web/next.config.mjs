/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@molemisi/shared', '@molemisi/game-types', '@molemisi/validation'],
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;
