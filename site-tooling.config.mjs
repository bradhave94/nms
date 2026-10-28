// site-tooling.config.mjs (nms, nomansskyrecipes.com): settings for the shared tooling, which is the same file in every
// game-site repo: scripts/seo-audit.mjs, scripts/check-dist.mjs, scripts/cloudflare-redirects.mjs,
// scripts/game-update.mjs and src/components/Analytics.astro. Change behaviour here, not in those files.
// Plain data and small functions only, no top-level imports. Functions get `ctx` ({ root, readText, readJson, exists }).
//
// Not used here, on purpose:
// - Analytics.astro: GA (G-9GEFK3YPV3) stays inline in src/layouts/Layout.astro between the NitroPay ad/CMP snippets and
//   the JSON-LD. It has no map, so none of the URL-cleaning shim applies, it also runs in dev builds, and moving it would
//   change the script order next to NitroPay. Keep it as it is.
// - cloudflare-redirects.mjs: public/_redirects is hand-kept here (legacy item URLs are meta-refresh pages and
//   src/integrations/trailingSlashRedirects.ts appends the 308 rules), vercel.json is a leftover.
// - check-dist.mjs: no equivalent today (the build's own integrations and scripts/check-*.mjs cover it).
export default {
  site: {
    origin: 'https://nomansskyrecipes.com',
    dist: 'dist/client', // Cloudflare adapter: prerendered pages; dist/server is the Worker
  },

  analytics: null,

  seoAudit: {
    brand: { suffix: " | No Man's Sky Recipes", rule: 'suffix-unless-long' },
    games: [{ name: "No Man's Sky", pattern: "No Man['’]?s Sky|\\bNMS\\b", flags: 'i' }],
    og: { title: 'brandless-ok' },
    extraMeta: ['og:locale'],
    notFound: 'light',
    onDemand: '^/alliances(/|$)',          // prerender = false: served by the Worker, no HTML in dist
    stubs: true,                            // Astro.redirect() meta-refresh pages for legacy URLs count as redirects
    redirects: ['vercel.json', 'public/_redirects'],
    requireVideoGame: 'all',
    pageNodeContent: false,
    bannedTypes: ['Recipe', 'NutritionInformation', 'HowTo', 'HowToStep', 'HowToSupply', 'HowToTool', 'SpeakableSpecification'],
    pageType(u) {
      if (u === '/') return 'home';
      const s = u.split('/').filter(Boolean);
      if (s.length === 1) return s[0].endsWith('.html') ? s[0] : `${s[0]}/`;
      if (s[0] === 'blog') return 'blog/[slug]';
      if (/^\d+$/.test(s[1])) return `${s[0]}/[page]`;
      if (s[0] === 'calculator' || s[1] === 'cards' || s[1] === 'affinities') return `${s[0]}/${s[1]}/`;
      return `${s[0]}/[id]`;
    },
  },

  checkDist: null,
  redirects: null,

  // scripts/game-update.mjs (pnpm game-update): after the nms-data-extractor run. The source is the extractor repo
  // (NMS_EXTRACTOR_PATH, default ../nms-data-extractor), not ../_output like the other sites.
  gameUpdate: {
    source: { path: '../nms-data-extractor', env: 'NMS_EXTRACTOR_PATH', need: ['data/json'] },
    steps: [
      { phase: 'data', run: 'pnpm run data:check' },        // validate the extractor output (read-only) first
      { phase: 'data', run: 'pnpm run data:sync' },         // import into src/datav2 + icon WebP copies
      { phase: 'data', run: 'pnpm run data:icons' },        // idempotent: missing WebP copies, orphans removed
      { phase: 'test', run: 'pnpm run test:data-import' },
      { phase: 'test', run: 'pnpm run test:route-eligible' },
      { phase: 'test', run: 'pnpm run test:power' },
      { phase: 'test', run: 'pnpm run test:alliances' },
      { phase: 'test', run: 'pnpm run check:all' },         // type-check + lint
      { phase: 'build', run: 'pnpm run build' },
      { phase: 'check', run: 'pnpm run test:new-items' },   // reads dist/client/new/
      { phase: 'check', run: 'pnpm run test:player-unlocks' }, // reads dist/client/titles/
      { phase: 'check', run: 'pnpm run test:legacy-redirects' },
      { phase: 'audit', run: 'node scripts/seo-audit.mjs' },
    ],
    diffPaths: ['src/datav2', 'src/data', 'public/images/items'],
    summary: [(c) => {
      const n = c.readJson('src/datav2/new.json');
      return `new.json ${n.PreviousVersionKey} -> ${n.VersionKey}: +${n.Summary?.Added ?? '?'} added, ${n.Summary?.Changed ?? '?'} changed, -${n.Summary?.Removed ?? '?'} removed`;
    }],
  },
};
