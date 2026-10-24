import { defineConfig, envField } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import trailingSlashLinks from './src/integrations/trailingSlashLinks.ts';
import trailingSlashRedirects from './src/integrations/trailingSlashRedirects.ts';
import cleanGameNames from './src/integrations/cleanGameNames.ts';
import { writeIconWebps } from './scripts/icon-webp.mjs';
import { writeImageSizes } from './scripts/image-sizes.mjs';

const legacyRedirects = JSON.parse(
  readFileSync(new URL('./redirects.generated.json', import.meta.url), 'utf8')
);
const LEGACY_REDIRECT_PATHS = new Set(
  legacyRedirects.map(({ source }) => source.replace(/\/$/, ''))
);

// Blog posts get a real <lastmod> (updatedDate, else pubDate) read from their frontmatter.
// Data pages get none: their content only changes with game updates, and a shared
// fake date makes Google ignore lastmod for the whole site.
const BLOG_DIR = new URL('./src/content/blog/', import.meta.url);
const readFrontmatterDate = (source, key) => {
  const match = source.match(new RegExp(`^${key}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'));
  return match ? match[1] : undefined;
};
const BLOG_LASTMOD = new Map(
  readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => {
      const source = readFileSync(new URL(file, BLOG_DIR), 'utf8');
      const date = readFrontmatterDate(source, 'updatedDate') ?? readFrontmatterDate(source, 'pubDate');
      return [`/blog/${file.replace(/\.mdx?$/, '')}`, date];
    })
    .filter(([, date]) => Boolean(date))
);
const LATEST_BLOG_DATE = [...BLOG_LASTMOD.values()].sort().at(-1);

const SITEMAP_EXCLUDED_PATHS = new Set([
  '/feedback',
  '/privacy-policy',
  '/refining/cards',
  '/cooking/cards',
  '/crafting-guide/cards',
  '/creatures/affinites',
  '/guides',
  // noindex pages
  '/alliances/admin',
  '/alliances/submit',
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

  // /creatures/species/<ID>/ are redirect stubs to /creatures/<ID>/ (the index stays).
  if (/^\/creatures\/species\/[^/]+$/.test(pathname)) {
    return false;
  }

  return true;
};

// https://astro.build/config
export default defineConfig({
  site: "https://nomansskyrecipes.com",
  trailingSlash: 'always',
  // Pages stay static; only routes that set `prerender = false` (the alliance directory) run in the Worker.
  // Cloudflare Workers with static assets (wrangler.jsonc). Pages prerender in Node (they read files at build time);
  // no Images or KV binding: images aren't transformed and Astro sessions aren't used.
  adapter: cloudflare({ imageService: 'passthrough', prerenderEnvironment: 'node' }),
  session: false,
  env: {
    schema: {
      ALLIANCES_ADMIN_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Legacy ntfy topic for submission push alerts; left unset because ntfy.sh rate-limits shared Workers IPs.
      ALLIANCES_NTFY_TOPIC: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Verified Email Routing destination for submission alerts (ALERT_EMAIL binding). Unset: no email alerts.
      ALLIANCES_ALERT_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  // /farm and /farm/ are in public/_redirects (from vercel.json); the Cloudflare adapter copies these into
  // dist/client/_redirects too, so a path must not be in both. /alliances/null shadows a Worker route.
  redirects: {
    '/alliances/null': { status: 301, destination: '/alliances/null-2/' },
  },
  integrations: [
    // `/alliances` is rendered on demand, so it has no HTML file to detect.
    trailingSlashLinks({ extraPaths: ['/alliances'] }),
    // Permanent 308s from /path to /path/ (the asset layer's own redirect is a 307).
    trailingSlashRedirects(),
    {
      // Pages show WebP icons; fill in any that weren't generated so none render broken.
      name: 'icon-webp',
      hooks: {
        // og:image sizes: refresh src/data/image-sizes.json before anything imports it.
        'astro:config:setup': ({ logger }) => {
          const { count, changed } = writeImageSizes();
          if (changed) logger.info(`Updated image sizes (${count} images). Commit src/data/image-sizes.json.`);
        },
        'astro:build:done': async ({ dir, logger }) => {
          const { written } = await writeIconWebps(fileURLToPath(new URL('images/items/', dir)));
          if (written) logger.warn(`Generated ${written} missing WebP icons. Run \`node scripts/icon-webp.mjs\` and commit them.`);
        },
      },
    },
    sitemap({
      filter: shouldIncludeInSitemap,
      // On-demand pages aren't discovered by the sitemap integration.
      customPages: ['https://nomansskyrecipes.com/alliances/'],
      // Alliance listings are rendered on demand, so they get their own SSR sitemap.
      customSitemaps: ['https://nomansskyrecipes.com/alliances/sitemap.xml'],
      serialize: (item) => {
        const pathname = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        const lastmod = pathname === '/blog' ? LATEST_BLOG_DATE : BLOG_LASTMOD.get(pathname);
        return {
          url: item.url,
          ...(lastmod ? { lastmod: new Date(`${lastmod}T00:00:00Z`).toISOString() } : {}),
        };
      },
    })
  ],
  vite: {
    plugins: [cleanGameNames(), tailwindcss()],
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