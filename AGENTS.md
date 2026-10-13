# AGENTS.md

## Cursor Cloud specific instructions

This is a self-contained **Astro** static site (No Man's Sky Recipes) with no database, external APIs, or Docker dependencies. All game data lives as static JSON in `src/data/` and `src/datav2/`.

### Running services

- **Dev server:** `pnpm run dev` — starts on `http://localhost:4321/`

### Standard commands

This project uses **pnpm 11+** (`packageManager` in `package.json`). See `package.json` scripts and `README.md` for the full list. Key commands:

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Lint | `pnpm run lint` |
| Type-check | `pnpm run type-check` |
| Build | `pnpm run build` |
| Dev server | `pnpm run dev` |

### Notes

- The ESLint config uses flat config format (`eslint.config.mjs`) with ESLint 9. The `lint` script uses `--ext` flags which work with the current setup.
- `pnpm-workspace.yaml` lists `allowBuilds` for `esbuild` and `sharp` (required for Astro image optimization under pnpm’s install-script policy).
- `pnpm run build` generates ~4,800+ static pages and takes ~25 seconds. This is expected.
- **Node.js:** Astro 7 requires `>=22.12.0`. Production (Vercel) uses **24.x**; `.nvmrc` is set to `24` for local parity.
- No environment variables or secrets are needed for development.
- Item icons in `public/images/items/` are the game's PNGs, each with a committed WebP copy that pages display (wrap icon names in `toWebp()` from `src/utils/icons.ts`). Social previews, structured data, and the image sitemap keep the PNG URLs. `pnpm run data:sync` refreshes the WebP copies; after adding or replacing PNGs by hand, run `pnpm run data:icons` (or `pnpm run data:icons -- --all` for replaced files). The build fills in missing copies and warns.
- Internal links are written without a trailing slash in many places. A post-build step (`src/integrations/trailingSlashLinks.ts`) adds it in the HTML so clicks skip a 308 redirect.

### Alliance directory (`/alliances`)

- The only on-demand pages. They use `@astrojs/vercel` with `export const prerender = false`, and every other page stays static. Static output now builds to `dist/client/`.
- Storage is SQLite through `@libsql/client`. In production it's Turso (the Vercel integration sets `SQLITE_TURSO_DATABASE_URL`/`SQLITE_TURSO_AUTH_TOKEN`, Production only). Locally it falls back to `.data/alliances.db` (gitignored).
- Submissions are `pending` until approved at `/alliances/admin/`, which is gated by `ALLIANCES_ADMIN_TOKEN` (put it in `.env.local` for dev). If `ALLIANCES_NTFY_TOPIC` is set, each new submission and edit request sends a push notification to that ntfy.sh topic.
- Anyone can suggest changes to a listing at `/alliances/<slug>/edit/`. Requests are stored in `alliance_edits` and reviewed in the admin page's Edits tab, which shows only the changed fields; applying one updates the listing but keeps its private contact.
- Starter listings live in `src/utils/allianceSeeds.ts`. Load them as pending with `pnpm run seed:alliances` (local) or the "Load starter listings" button on the admin page (production, because Turso's env vars are sensitive and pull as empty). `pnpm run test:alliances` checks validation.
- `src/data/galaxies.json` (all 256 galaxy names and numbers) is generated from the Fandom wiki by `pnpm run data:galaxies`. The submit form and validation use it.
- The feedback form (`/feedback`) shares the alliance styles via the `.site-form` scope in `src/assets/css/alliances.css`.
- In agent shells, Astro 7's `astro dev` tries to background itself and fails on Windows. Run `ASTRO_DEV_BACKGROUND=1 pnpm exec astro dev` instead.

### SEO

- **Titles and descriptions:** item pages get theirs from `buildItemMeta` in `src/utils/seo.ts` (`Name | [hint |] category | No Man's Sky Recipes`; the category is dropped past 60 characters). Descriptions are a fixed lead plus whole sentences of the in-game text, capped at 160 characters and never cut mid-word. List pages use `buildPaginatedMeta` and the category copy in `src/config/categories.ts`; other pages set `title`/`description` on `Layout`. Use `withSiteTitle()` for new titles.
- **Head tags:** `src/layouts/Layout.astro` writes canonical, OG and Twitter tags. og:image width/height come from the file in `public/` at build time; images narrower than 600px get a `summary` card.
- **JSON-LD:** `Layout` always emits Organization, WebSite and the VideoGame (`#game`), plus a WebPage unless the page passes its own page node. Pass `breadcrumbs` to `Layout` to get a BreadcrumbList that matches the visible `<Breadcrumbs>`. Item pages: `src/utils/itemPageSchema.ts` (ItemPage `about` the item and the game, BreadcrumbList, FAQPage for the FAQ shown on the page). Lists: `buildCollectionStructuredData` in `src/utils/structuredData.ts`. Blog posts: `src/utils/guideStructuredData.ts` (WebPage + BlogPosting, FAQPage only when the post shows a FAQ).
- **Don't** mark up crafting, refining or cooking as schema.org `Recipe`/`NutritionInformation` (that type is for food; Google can treat it as spammy structured data), and don't add `HowTo` (no rich results) or `SpeakableSpecification` (news publishers only). FAQPage only where the questions are visible.
- **Audit:** after `pnpm run build`, run `node scripts/seo-audit.mjs --out seo-report.json --vocab <schemaorg-current-https.jsonld>` (vocabulary from https://schema.org/version/latest/schemaorg-current-https.jsonld; optional). It checks titles, descriptions, OG tags, canonicals, h1s, sitemap/robots, JSON-LD against schema.org, internal links and click depth over `dist/client/`. It's a report and always exits 0.

### Accessibility

- **Target:** WCAG 2.2 AA on every page type (plus cheap AAA wins). `/accessibility/` is the public statement (linked from the footer); keep its "known limitations" honest when things change, and don't claim full conformance.
- **Focus:** `main.css` has one unlayered `:focus-visible` style (3px `#facc15` outline). Don't remove focus indicators; `focus:outline-hidden` is fine only if a ring replaces it. Inside clipping containers (`overflow-*`, Tabulator) the outline is drawn inset automatically.
- **Item colour swatches:** never hard-code text colour on a game `Colour` background. Use `swatchStyle()` / `readableTextOn()` from `src/utils/contrast.ts`, and `bg-black/60 text-white` for amount badges on swatches.
- **Contrast:** body text >= 4.5:1 on the dark backgrounds (`text-gray-400` is the dimmest grey on `gray-800/900`; not `gray-500`). White-text buttons use `sky-700`/`#0369a1` or darker, not `sky-600`. Input borders need 3:1 (`border-sky-600`, `#0e7490` in `alliances.css`). Links inside sentences need an underline.
- **Targets:** interactive controls at least 24x24 CSS px (or spaced so a 24px circle doesn't touch a neighbour); primary controls 44px where it fits.
- **Structure:** one `<h1>` and no skipped heading levels; only `Sidebar.astro` renders `<main id="main-content">` (pages use `<div>`); ad slots (`NitroAd`) are not landmarks. Icons next to their own name get `alt=""`.
- **Widgets:** icon-only buttons need `aria-label`; search/filter result changes go to a `role="status"` region; dialogs (search, mobile drawer) trap Tab, close on Escape and return focus; nav flyouts are disclosure buttons (`aria-expanded`), not ARIA menus. Tabulator tables must call `applyTabulatorA11y()` (`src/utils/tabulatorA11y.ts`). `Accordion` takes `heading="h3"` for FAQ questions.
- **Check:** after `pnpm run build`, serve `dist/client` (`npx serve dist/client -l 4715`) and run `node axe.mjs` and `node manual.mjs` from `C:\Users\bradhave\Documents\workspace\game-sites\_output\a11y\nms\` (axe-core + Playwright from `_audit\tools`; keyboard flows, focus visibility, 320px reflow, text spacing, target size). For the alliance pages, run `ALLIANCES=1 node axe.mjs` against `astro dev` on the same port.
