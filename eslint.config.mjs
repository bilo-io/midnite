import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

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

  // Keep ESLint out of Prettier's lane (formatting rules disabled).
  prettier,
);
