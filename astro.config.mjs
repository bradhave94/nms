import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";

const legacyPageOnePaths = [
  "calculator",
  "products",
  "technology",
  "upgrades",
  "exocraft",
  "starships",
  "buildings",
  "corvette",
  "fish",
  "curiosities",
  "other",
  "food",
  "raw",
];

const redirects = Object.fromEntries(
  legacyPageOnePaths.flatMap((section) => [
    [`/${section}/1`, `/${section}`],
    [`/${section}/1/`, `/${section}`],
  ])
);

// https://astro.build/config
export default defineConfig({
  site: "https://nomansskyrecipes.com",
  redirects,
  integrations: [
    react({
      experimentalReactChildren: true
    }),
    sitemap(),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    })
  ],
  vite: {
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