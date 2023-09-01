import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://nms.vercel.app/",
  integrations: [ react(), sitemap(), tailwind({
    config: {
      applyBaseStyles: false
    }
  })]
});