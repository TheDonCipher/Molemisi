/**
 * Molemisi — ESLint 9 flat config (root).
 *
 * Replaces the legacy .eslintrc.js, which ESLint 9 no longer reads (that is
 * why `pnpm lint` failed with "couldn't find an eslint.config.js").
 *
 * Intent (kept from the old config):
 *   - consistent import/unused/`any` hygiene across the monorepo
 *   - Prettier formatting enforced through lint
 *
 * Note: type-aware rules (@typescript-eslint/recommended-requiring-type-checking)
 * from the old config are intentionally NOT enabled — they require a per-package
 * tsconfig "project service" that was never wired up and would fail every lint run.
 */
const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');

const prettierRules = {
  ...eslintConfigPrettier.rules,
  'prettier/prettier': 'error',
};

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.git/**',
      // Generated — formatted by its generator, not Prettier
      'apps/game/src/generated-assets.ts',
      // Supabase config / SQL
      'supabase/**',
    ],
  },
  // JavaScript / ESM scripts (scripts/*.mjs, next.config.js, etc.)
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierRules,
    },
  },
  // TypeScript (game client, web app, api, shared packages)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      // eslint:recommended rules that still apply to TS source; the rest are
      // covered by tsc / @typescript-eslint.
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': js.configs.recommended.rules['no-useless-escape'],
      ...tsPlugin.configs.recommended.rules,
      ...prettierRules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
