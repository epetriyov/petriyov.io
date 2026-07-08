// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';

// Keystatic (и нужные ему react/markdoc) подключается только в `astro dev`:
// в production-сборке нет ни его роутов, ни серверного рантайма — dist/ остаётся чистой статикой.
const isDev = process.argv.includes('dev');
const devOnlyIntegrations = isDev
  ? [
      (await import('@astrojs/react')).default(),
      (await import('@astrojs/markdoc')).default(),
      (await import('@keystatic/astro')).default(),
    ]
  : [];

export default defineConfig({
  site: 'https://petriyov.io',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/og/'),
    }),
    ...devOnlyIntegrations,
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    shikiConfig: {
      // светлая тема, близкая к палитре сайта
      theme: 'vitesse-light',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
