import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { SITE } from './src/config.ts';

const SITEMAP_EXCLUDED_PATHS = new Set([
  '/feedback',
  '/privacy-policy',
  '/refining/cards',
  '/cooking/cards',
  '/crafting-guide/cards',
  '/creatures/affinites',
  '/guides',
]);

const shouldIncludeInSitemap = (page) => {
  const pageUrl = new URL(page);
  const pathname = pageUrl.pathname.replace(/\/$/, '') || '/';

  if (SITEMAP_EXCLUDED_PATHS.has(pathname)) {
    return false;
  }

  if (pathname.startsWith('/guides/')) {
    return false;
  }

  return true;
};

// https://astro.build/config
export default defineConfig({
  site: "https://nomansskyrecipes.com",
  integrations: [
    sitemap({
      filter: shouldIncludeInSitemap,
      lastmod: new Date(SITE.version_date),
      changefreq: 'weekly',
      priority: 0.7,
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Ensure tabulator-tables is chunked separately
            if (id.includes('tabulator-tables')) {
              return 'tabulator';
            }
          }
        }
      }
    }
  }
});