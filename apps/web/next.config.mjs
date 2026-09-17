import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Molemisi is a pnpm monorepo: `next dev` runs from apps/web, so the repo-root
// .env (single source of truth for secrets) is NOT auto-loaded by Next. Load
// it explicitly so NEXT_PUBLIC_* values are inlined at build time.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnv)) {
  for (const raw of fs.readFileSync(rootEnv, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@molemisi/shared', '@molemisi/game-types', '@molemisi/validation'],
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;
