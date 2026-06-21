import type { StorybookConfig } from '@storybook/react-vite';

// @midnite/ui's own Storybook (Phase 25 Theme D). This is the leaf library's
// component catalog + design-system docs — react-vite, NOT nextjs-vite (the lib
// has no Next.js): the primitives are framework-agnostic React + Tailwind.
//
//  - stories: the primitive *.stories.tsx live alongside each component in
//    src/components; the Design System MDX docs live in src/docs.
//  - addon-vitest mounts every story in a real (headless chromium) browser under
//    `moon run ui:test`; addon-a11y runs axe; addon-docs renders the MDX pages.
const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.stories.tsx', '../src/**/*.mdx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest', '@storybook/addon-docs'],
};

export default config;
