import { defineConfig, envField } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import vercel from '@astrojs/vercel';
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from 'node:fs';

import { SITE } from './src/config.ts';

const legacyRedirects = JSON.parse(
  readFileSync(new URL('./redirects.generated.json', import.meta.url), 'utf8')
);
const LEGACY_REDIRECT_PATHS = new Set(
  legacyRedirects.map(({ source }) => source.replace(/\/$/, ''))
);

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

  if (LEGACY_REDIRECT_PATHS.has(pathname)) {
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
  // Pages stay static; only routes that set `prerender = false` (the alliance directory) run as functions.
  adapter: vercel(),
  env: {
    schema: {
      // Added by the Turso integration on Vercel. Unset locally, which uses a SQLite file in .data/.
      SQLITE_TURSO_DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SQLITE_TURSO_AUTH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      ALLIANCES_ADMIN_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  redirects: {
    '/farm': '/calculator/farm',
  },
  integrations: [
    sitemap({
      filter: shouldIncludeInSitemap,
      // On-demand pages aren't discovered by the sitemap integration.
      customPages: ['https://nomansskyrecipes.com/alliances/'],
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