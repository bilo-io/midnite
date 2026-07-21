import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Phase 79 E — files whose user-facing JSX copy is fully externalized to next-intl.
// The no-hardcoded-string rule errors *only* here, so a regression (a new literal
// string added to a migrated surface) fails CI, while the ~500 un-migrated files
// stay unaffected. A file joins this list once its visible copy is converted.
const I18N_ENFORCED = [
  'packages/web/components/locale-flag.tsx',
  'packages/web/components/language-switcher.tsx',
  'packages/web/components/auth/sso-buttons.tsx',
  'packages/web/app/(auth)/login/page.tsx',
  'packages/web/app/(main)/settings/settings-sidebar.tsx',
  'packages/web/components/confirm-dialog.tsx',
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/build-staging/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/node_modules/**',
      'packages/gateway/drizzle/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      // Next-generated, not ours to lint.
      '**/next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript/TSX sources — node + browser globals cover both gateway and web.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Committed code uses structured logging / CLI output helpers; bare
      // console is opt-in via an inline disable (the codebase already does this).
      'no-console': 'error',
      // Allow intentionally-unused args prefixed with _ (common in stubs/handlers).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Best-effort cleanup catches (e.g. unlink on a temp file) are intentional.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Dependency-free CJS hook scripts + build/config scripts: require() + console ok.
  {
    files: ['**/*.cjs', '**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },

  // The CLI prints to stdout/stderr — console IS its output channel.
  {
    files: ['packages/cli/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // The PWA service worker runs in the ServiceWorkerGlobalScope (self, caches,
  // clients, fetch, …), not a node/window context.
  {
    files: ['**/public/sw.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },

  // i18n no-hardcoded-string gate (Phase 79 E), scoped to the migrated surfaces.
  // `jsx-text-only` targets visible copy (JSX text) and ignores structural
  // attributes (className, data-*, aria/role) so it doesn't flag non-copy.
  {
    files: I18N_ENFORCED,
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },

  // Keep ESLint out of Prettier's lane (formatting rules disabled).
  prettier,
);
