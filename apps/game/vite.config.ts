import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Workspace packages are compiled to CommonJS (plain `tsc`), but this app is
 * ESM (`"type": "module"`). Instead of relying on Node CJS interop, resolve
 * the shared packages straight to their TypeScript source so Vite/Rollup can
 * statically see named exports (e.g. `import { CROPS }`).
 */
const workspaceAliases = {
  '@molemisi/game-config': path.join(root, 'packages', 'game-config', 'src', 'index.ts'),
  '@molemisi/game-types': path.join(root, 'packages', 'game-types', 'src', 'index.ts'),
};

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...workspaceAliases,
    },
  },
  server: {
    port: 3002,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
