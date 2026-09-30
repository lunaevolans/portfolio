// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

/**
 * Deploy target is resolved from the environment so the same code works at
 * https://lunaevolans.github.io/ (repo renamed to `<owner>.github.io`) and at
 * https://lunaevolans.github.io/portfolio/ (project page) without edits.
 * The deploy workflow sets SITE_URL and BASE_PATH.
 */
const site = process.env.SITE_URL ?? 'https://lunaevolans.github.io';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [preact({ compat: false }), sitemap()],
  markdown: {
    // Code colours come from the active rice via CSS variables (see global.css).
    shikiConfig: { theme: 'css-variables' },
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'auto' },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});
