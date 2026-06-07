# No Man's Sky Recipes — Site Review

**Reviewed:** 2026-06-07 · **Branch context:** Astro 6 static site, game data in `src/datav2/` (23 JSON files, ~495k lines), ~4,800+ prerendered pages via `src/pages/*/[id].astro` → `src/layouts/Page.astro`. Game version: **Swarm 6.40.0.1** (`src/config.ts`, `src/datav2/new.json`).

This document lists prioritized feature ideas and improvements. No code was changed during this review.

---

## What already works well

- **Recipe graph depth** on item pages is excellent: craft trees (`NestedList.astro`), flattened raw materials, refine/cook/craft reverse lookups, quantity multiplier with `[data-quantity]` scaling (`src/layouts/Page.astro`).
- **`/items` hub** offers group/type/name filtering with URL sync and infinite scroll (`src/pages/items/index.astro`, `src/pages/items.json.ts`).
- **Patch awareness** via `/new` and `UpdateChangesPanel.astro` + `src/datav2/new.json` is valuable for returning players.
- **Creatures / Xeno Arena** section is deep and separate from the main item template (`src/pages/creatures/*`, `src/datav2/Creatures.json`).
- **SEO/AEO foundation** is above average: per-item FAQ/HowTo/Recipe JSON-LD, `SpeakableSpecification` on `.item-summary`, `Dataset` on `/items`, AI crawler allowlist in `src/pages/robots.txt.ts`, and `src/pages/llms.txt.ts`.

---

## High priority

### 1. Multi-item crafting planner (shopping-list calculator)

**Why it matters:** The nav item “Crafting Calculator” (`src/pages/calculator/index.astro`) is a paginated list of **105 products** sorted by `BaseValueUnits`, not a planner. Per-item quantity scaling exists on detail pages, but players building bases or farms need totals across multiple targets (e.g. “5 Stasis Devices + 10 Living Glass”).

**Effort:** Hard

**Files/areas:** New planner UI (likely `src/pages/calculator/` or a new route), reuse quantity/raw-material flattening from `src/layouts/Page.astro` and `src/components/NestedList.astro`, `src/utils/lookup.ts` for ingredient resolution.

---

### 2. Surface food consumable effects on food pages

**Why it matters:** `Food.json` (386 items) includes `EffectCategory` and `RewardEffectStats` (e.g. `food/FOOD_V_BLOB` — Sticky 'Honey' → Life Support +20 recharge at lines 798–806), but `Page.astro` never renders these fields. Players choose food for hazard recharge, health, stamina, and jetpack bonuses — this is among the largest player-facing data gaps.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro` (food-specific section), `src/datav2/Food.json`.

---

### 3. Render visible FAQ blocks to match FAQPage schema

**Why it matters:** Every item page emits `FAQPage` JSON-LD with 2–3 auto-generated Q&As (`Page.astro` lines 587–614), and blog posts with `faqs` frontmatter emit schema via `src/utils/guideStructuredData.ts` — but neither renders matching visible FAQ HTML. Search engines and answer engines expect schema to align with on-page content.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/layouts/GuideLayout.astro`, reuse `src/components/Accordion.astro`.

---

### 4. Add search and filters to category grid pages

**Why it matters:** `/products`, `/upgrades`, `/fish`, `/buildings`, etc. use **alphabetical pagination only** (80 items/page, e.g. `src/pages/products/index.astro`). Players must paginate or jump to `/items` for filtering. Fish pages show rich metadata (biome, storm, time) on detail pages (`Page.astro` lines 880–938) but `/fish` has no list-level filters. Upgrade modules show stat ranges on detail pages only (`Page.astro` lines 949–966) with no slot/class filter on `/upgrades`.

**Effort:** Medium

**Files/areas:** Category `index.astro` / `[page].astro` files under `src/pages/{products,upgrades,fish,buildings,...}/`, borrow patterns from `src/pages/items/index.astro`.

---

### 5. Index creatures in global search

**Why it matters:** `src/components/SearchModal.astro` filters 13 item categories but omits creatures. `src/pages/search.json.ts` builds its index from `src/datav2/index.ts` exports only — no species names, moves, or arena content from `Creatures.json`. Xeno Arena players cannot discover `/creatures/species/*` or `/creatures/moves` via the site-wide search FAB.

**Effort:** Medium

**Files/areas:** `src/pages/search.json.ts`, `src/components/SearchModal.astro`, `src/datav2/Creatures.json`.

---

### 6. Precompute recipe reverse indexes (build performance)

**Why it matters:** Each of ~4,000+ item detail pages runs linear scans via `findOutput`, `findInputFromRefiner`, `findInputFromCooking`, and `findInputFromCrafting` in `src/utils/lookup.ts`. Table pages (`src/pages/refining/index.astro`, `src/pages/cooking/index.astro`) call `getById` per recipe row across 358 refiner and 1,323 nutrient-processor recipes. Build takes ~25s today; this will worsen as data grows.

**Effort:** Medium

**Files/areas:** `src/utils/lookup.ts`, optional build-time generated index JSON alongside `src/datav2/`, `src/layouts/Page.astro`.

---

### 7. Show technology installed effects (`StatBonuses`)

**Why it matters:** `Technology.json` items like `technology/PROTECT` (Hazard Protection) include `StatBonuses` arrays, but stat UI in `Page.astro` only renders when `Slug` starts with `upgrades/` (`isUpgradePage`, lines 949–966). Core suit/ship/multi-tool tech pages hide protection and bonus flags that players need for loadout planning.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/datav2/Technology.json`, `ConstructedTechnology.json`, `TechnologyModule.json`.

---

### 8. Fix `search.json` / `items.json` index pollution

**Why it matters:** Both endpoints flatten all exports from `src/datav2/index.ts` without guarding non-array values:

```31:33:src/pages/search.json.ts
const allData = Object.values(dataSources).flatMap((source) => source as Item[]);
const data = sort(allData as Item[]);
```

`index.ts` exports `Creatures` (nested object) and `NewUpdate` from `new.json` (patch diff object with `Items`/`ChangedItems` arrays). This can duplicate patch items in search/API results. Contrast with `src/utils/seo.ts`, which correctly uses `Array.isArray` guards.

**Effort:** Easy

**Files/areas:** `src/pages/search.json.ts`, `src/pages/items.json.ts`, `src/datav2/index.ts`.

---

### 9. Refining profit / units analysis column

**Why it matters:** `src/pages/crafting-guide/index.astro` sorts by `value` (`BaseValueUnits`) and shows a Value column; `src/pages/refining/index.astro` shows inputs/outputs only — no units-in vs units-out or profit column. Refiner optimizers are a core NMS player activity.

**Effort:** Medium

**Files/areas:** `src/pages/refining/index.astro`, `src/components/table/Table.astro`, `src/datav2/Refinery.json` (also has unused `Time` and `Operation` fields).

---

### 10. Add structured data to recipe hub pages

**Why it matters:** `/refining`, `/cooking`, and `/crafting-guide` have good meta descriptions but **no JSON-LD** (unlike category list pages using `src/utils/structuredData.ts`). These are high-traffic recipe hubs and prime FAQ/HowTo/ItemList candidates for SEO and AEO.

**Effort:** Medium

**Files/areas:** `src/pages/refining/index.astro`, `src/pages/cooking/index.astro`, `src/pages/crafting-guide/index.astro`, `src/utils/structuredData.ts` or new hub-specific helper.

---

## Medium priority

### 11. Upgrade module comparison view

**Why it matters:** No comparison feature exists anywhere in `src/`. S-class upgrade modules have min/max stat ranges (`Upgrades.json`, 496 items) that are hard to evaluate in isolation. Players routinely compare Suit/Ship/MT modules side-by-side.

**Effort:** Hard

**Files/areas:** New comparison page or modal, `src/datav2/Upgrades.json`, stat formatting logic from `Page.astro` (`formatStatRange`, lines 757–778).

---

### 12. Include corvette in crafting reverse lookups

**Why it matters:** `findInputFromCrafting` in `lookup.ts` (line 320) scans products, upgrades, exocraft, starships, etc. but **omits `corvette`**. Corvette parts (638 items in `Corvette.json`) won't appear in “used to craft” reverse links on ingredient pages. Additionally, `corvette` is imported in `lookup.ts` but absent from the `dataSources` prefix map (lines 69–85), relying on slower full-catalog fallback scans.

**Effort:** Easy

**Files/areas:** `src/utils/lookup.ts`, `src/datav2/Corvette.json`.

---

### 13. Cross-link arena and pet-shop rewards to item pages

**Why it matters:** `src/pages/creatures/arena.astro` renders pet shop eggs with icon/name/description but **no links** (`getSlug`/`href` unused). Win/loss rewards are summarized as text via `summarizeReward()` without linking to product pages. Players can't navigate from arena rewards to craft/value details.

**Effort:** Easy

**Files/areas:** `src/pages/creatures/arena.astro`, `src/utils/lookup.ts` (`getSlug`).

---

### 14. Display building placement constraints

**Why it matters:** `Buildings.json` (1,234 items) includes `BuildableOnPlanetBase`, `BuildableOnFreighter`, `BuildableOnSpaceBase`, and `Groups[]` on most entries — none rendered on building detail pages. Base builders need to know planet vs freighter vs orbital placement.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/datav2/Buildings.json`.

---

### 15. Show refiner operation name and processing time

**Why it matters:** `Refinery.json` stores `Operation` (e.g. “Nanite Extraction”) and `Time` (e.g. `"320.0"`) per recipe, but neither `/refining` tables nor item-side refine sections display them. Duration matters for portable vs medium vs large refiner planning.

**Effort:** Easy

**Files/areas:** `src/datav2/Refinery.json`, `src/pages/refining/index.astro`, `src/layouts/Page.astro` refine sections.

---

### 16. Fix Recipe schema step anchor mismatch

**Why it matters:** Food items emit `Recipe` JSON-LD with `recipeInstructions` URLs pointing to `#recipe-step-1` and `#recipe-step-2` (`Page.astro` lines 668–675), but those element IDs do not exist in the HTML. Broken schema anchors weaken rich-result eligibility.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro` — add anchor IDs to cooking steps or remove URLs from schema.

---

### 17. “Related items” and recipe-chain cross-linking

**Why it matters:** Cross-linking is strong for ingredients/outputs (`NestedList.astro`, `table/Cell.astro`, group pill → `/items?group=…`) but there is no “related items” block (same group, frequent co-ingredients, upgrade family). Blog guides with `relatedLinks` in frontmatter (`src/content.config.ts`) are not surfaced on relevant item pages.

**Effort:** Medium

**Files/areas:** `src/layouts/Page.astro`, `src/content/blog/*.md`, `src/utils/lookup.ts`.

---

### 18. Rename or expand the “Calculator” to match expectations

**Why it matters:** Sidebar (`src/layouts/Sidebar.tsx`) and `/calculator` marketing copy promise ingredient calculation, but the route is a **value-sorted product picker** linking to standard item pages. This sets incorrect expectations for new visitors.

**Effort:** Medium (rename/copy: Easy; expand scope: ties to item #1)

**Files/areas:** `src/pages/calculator/index.astro`, `src/layouts/Sidebar.tsx`, `src/pages/llms.txt.ts`.

---

### 19. Fish mission IDs → player-facing names

**Why it matters:** Fish detail pages display raw mission keys like `RequiresMissionActive: "KILL_JELLYBOSS"` (`Fish.json`) instead of localized names. `localization.json` (~82k strings) is already used for plant grow times (`src/utils/plantGrowTime.ts`) but not fishing missions.

**Effort:** Medium

**Files/areas:** `src/layouts/Page.astro` (fish section), `src/datav2/localization.json`, `src/datav2/Fish.json`.

---

### 20. Affinity chart → filtered species lists

**Why it matters:** `src/pages/creatures/affinities.astro` shows matchup data but doesn't link to filtered species lists by affinity type. Species table (`src/pages/creatures/species/index.astro`) links to individual species but not back to the affinities guide.

**Effort:** Medium

**Files/areas:** `src/pages/creatures/affinities.astro`, `src/pages/creatures/species/index.astro`.

---

### 21. Consolidate duplicate category page templates

**Why it matters:** ~12 categories repeat the same triple pattern (`index.astro`, `[page].astro`, `[id].astro`) with near-identical pagination, breadcrumbs, and structured data boilerplate. Hardcoded image URLs (`'https://nomansskyrecipes.com/images/items/' + item.Icon`) appear instead of `SITE.imageBaseUrl` from `src/config.ts`.

**Effort:** Hard (full config-driven routes); Easy (centralize image base URL only)

**Files/areas:** `src/pages/{products,raw,food,fish,...}/`, `src/config.ts`, `src/utils/structuredData.ts`.

---

### 22. Blog schema: `BlogPosting` + article Open Graph

**Why it matters:** Blog posts use generic `Article` schema and inherit `og:type=website` from `Layout.astro`. How-to posts (e.g. `src/content/blog/how-to-craft-stasis-device-no-mans-sky.md`) would benefit from `BlogPosting`/`HowTo` and `og:type=article` with `article:published_time`.

**Effort:** Easy

**Files/areas:** `src/utils/guideStructuredData.ts`, `src/layouts/Layout.astro`, `src/layouts/GuideLayout.astro`.

---

### 23. Link `llms.txt` from `robots.txt`

**Why it matters:** `src/pages/llms.txt.ts` provides a machine-readable site map for LLMs, and `robots.txt.ts` explicitly allows GPTBot, ChatGPT-User, Google-Extended, anthropic-ai, and PerplexityBot — but does not reference `/llms.txt`. Adding a comment or link improves discoverability for answer engines.

**Effort:** Easy

**Files/areas:** `src/pages/robots.txt.ts`.

---

## Low priority

### 24. Keyboard shortcut for global search (Ctrl+K / `/`)

**Why it matters:** Search is only reachable via the bottom-right FAB (`src/components/Search.astro`). Power users expect `/` or Ctrl+K, especially on a data-heavy reference site.

**Effort:** Easy

**Files/areas:** `src/components/SearchModal.astro`, `src/components/Search.astro`.

---

### 25. In-page section navigation on long item pages

**Why it matters:** Item pages with many “used in” recipes can be very long (`Page.astro` defers crafting lists beyond 30 entries with “Load more”). Jump links to #crafting, #refining, #used-to-create would reduce scroll fatigue.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`.

---

### 26. Search results with icons and category badges

**Why it matters:** `SearchModal.astro` renders text-only result links. Icons are available at `SITE.imageBaseUrl` + item icon filename; category labels exist in `filterLabels`.

**Effort:** Easy

**Files/areas:** `src/components/SearchModal.astro`, `src/pages/search.json.ts` (include icon field).

---

### 27. Sidebar navigation grouping

**Why it matters:** `Sidebar.tsx` lists 21 flat entries (guides, catalogs, meta) with active state via `slug.includes(item.href)`, which can mis-highlight paths (e.g. `/products` vs `/product`).

**Effort:** Easy

**Files/areas:** `src/layouts/Sidebar.tsx`.

---

### 28. Surface acquisition hints (`PinObjective`, purple systems, stack/rarity)

**Why it matters:** Raw materials like `raw/PURPLE2` (Quartzite) flag `OnlyFoundInPurpleSystems: true` in `RawMaterials.json`; most items have `MaxStackSize`, `Rarity`, and `Legality` in JSON. Exocraft partially localizes `PinObjective` (`Page.astro` lines 697–702); other categories don't.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/datav2/RawMaterials.json`, `src/datav2/localization.json`.

---

### 29. Show `DeploysInto` on blueprints and upgrades

**Why it matters:** Upgrade entries (e.g. `UP_LASER1`) include `DeploysInto` pointing to the installed module. Players researching blueprints want to know what slot/module the blueprint installs into.

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/datav2/Upgrades.json`, `Technology.json`.

---

### 30. Corvette part → ship tech upgrade linking

**Why it matters:** Corvette parts store `BuildableShipTechID` and `BuildableShipTechName` (e.g. `corvette/B_COK_A` → Flight Control Systems C-Class Upgrade) but detail pages only show category/rarity/craftable (`Page.astro` lines 781–788).

**Effort:** Easy

**Files/areas:** `src/layouts/Page.astro`, `src/datav2/Corvette.json`, `src/utils/lookup.ts`.

---

### 31. Archived / removed items from `none.json`

**Why it matters:** `src/datav2/none.json` holds ~66 archived items (e.g. removed companion eggs, deprecated invitations). `new.json` tracks `RemovedIds` but there are no public detail pages; crafting cross-refs to archived IDs may fail in `getById`.

**Effort:** Medium

**Files/areas:** `src/datav2/none.json`, `src/datav2/new.json`, `src/utils/lookup.ts`, new optional `/archived/` route.

---

### 32. Replace React sidebar with Astro (runtime JS reduction)

**Why it matters:** `Layout.astro` hydrates `Sidebar.tsx` with `client:idle`, pulling React 19 + Headless UI + Heroicons on **every page**. This is the main sitewide client JS cost; everything else is mostly static HTML or route-scoped Tabulator.

**Effort:** Medium–Hard

**Files/areas:** `src/layouts/Sidebar.tsx`, `src/layouts/Layout.astro`.

---

### 33. Remove legacy `src/data/` duplicate dataset

**Why it matters:** `src/data/` contains 15 files including older extracts (`Cooking.json` vs live `Food.json`). No app imports reference `src/data/` — only `src/datav2/` is used. Dead data risks confusion during updates.

**Effort:** Easy

**Files/areas:** `src/data/` (entire directory), verify no scripts depend on it.

---

### 34. JSON schema validation in CI

**Why it matters:** Game data is imported as untyped JSON with frequent `as unknown as` casts in `lookup.ts` and `Page.astro`. A validation script (Zod or JSON Schema) run on `src/datav2/*.json` would catch field regressions when the extract updates.

**Effort:** Medium

**Files/areas:** New script in `package.json`, `src/datav2/*.json`, `src/utils/lookup.ts` `Item` type.

---

### 35. Sitemap and pagination SEO polish

**Why it matters:** `astro.config.mjs` sets `lastmod: new Date()` on every URL every build (reduces crawl cache value). Paginated category pages lack `<link rel="prev">` / `<link rel="next">`. `/creatures/species/*` detail pages are **excluded** from the sitemap (`shouldIncludeInSitemap` lines 25–27) — confirm intentional if those pages should rank.

**Effort:** Easy–Medium

**Files/areas:** `astro.config.mjs`, `src/layouts/Layout.astro`, paginated `src/pages/*/[page].astro` files.

---

### 36. Reverse calculator (“what can I make with X?”)

**Why it matters:** Forward recipe traversal is excellent; the inverse (“I have 10,000 Ferrite Dust — best crafts/refines?”) is not available. Would complement the multi-item planner (#1).

**Effort:** Hard

**Files/areas:** New page, precomputed indexes from `lookup.ts`, `Refinery.json`, crafting sources.

---

### 37. Farm / grow-time calculator

**Why it matters:** Plant grow times are derived and shown per harvest item (`src/utils/plantGrowTime.ts`, `localization.json`), but there is no tool to plan farm plots by real-time duration and yield.

**Effort:** Medium

**Files/areas:** `src/utils/plantGrowTime.ts`, new calculator route, `Food.json` / harvest items in `Products.json`.

---

### 38. Recipe-as-query search (“2 oxygen → carbon”)

**Why it matters:** Global search matches item names only (`search.json.ts`). Players often remember refiner inputs/outputs, not product names. Searching recipe tuples would improve discoverability.

**Effort:** Hard

**Files/areas:** `src/pages/search.json.ts`, `Refinery.json`, `NutrientProcessor.json`.

---

### 39. Wire up or remove `controllerLookup.generated.json`

**Why it matters:** `src/datav2/controllerLookup.generated.json` exists but has **no references** in `src/`. Could localize `[E]` / button hints in descriptions, or be deleted to reduce repo noise.

**Effort:** Easy (delete) / Medium (localize)

**Files/areas:** `src/datav2/controllerLookup.generated.json`, `src/layouts/Page.astro` description rendering.

---

### 40. Split monolithic `Page.astro` (~1,580 lines)

**Why it matters:** One layout handles all item types, JSON-LD generation, category pills, recipe sections, client scripts, and pagination. Splitting into typed subcomponents would improve maintainability and build caching, but is not user-visible on its own.

**Effort:** Hard

**Files/areas:** `src/layouts/Page.astro` → `src/components/item/*`.

---

## Data completeness snapshot

| Dataset | Count (approx.) | Detail route | Key unused fields |
|---------|-----------------|--------------|-------------------|
| `Buildings.json` | 1,234 | `/buildings/[id]` | Placement flags, `Groups` |
| `Corvette.json` | 638 | `/corvette/[id]` | `BuildableShipTech*`, craft costs |
| `Others.json` + `Trade.json` | ~665 | `/other/[id]` | Trade/economy modifiers |
| `Upgrades.json` | 496 | `/upgrades/[id]` | Stats shown; `DeploysInto` hidden |
| `Food.json` | 386 | `/food/[id]` | `RewardEffectStats`, `CookingValue` |
| `NutrientProcessor.json` | 1,323 | *(table only)* | No per-recipe detail pages |
| `Refinery.json` | 358 | *(table only)* | `Time`, `Operation` |
| `Fish.json` | 226 | `/fish/[id]` | Mission IDs not localized |
| `Technology*.json` | ~337 | `/technology/[id]` | `StatBonuses` (non-upgrade) |
| `Products.json` | 105 | `/products/[id]` | `DeploysInto`, trade fields |
| `RawMaterials.json` | 67 | `/raw/[id]` | `OnlyFoundInPurpleSystems`, `Symbol` |
| `Creatures.json` | nested | `/creatures/*` | Not in global search |
| `none.json` | ~66 | *(none)* | Archived items unreachable |

---

## Suggested implementation order

If tackling incrementally, a pragmatic sequence:

1. **Easy wins with high player value:** food effects (#2), tech stats (#7), building placement (#14), refiner time (#15), corvette lookup fix (#12), search index bug (#8).
2. **SEO/AEO quick fixes:** visible FAQs (#3), recipe anchor IDs (#16), hub structured data (#10), `llms.txt` link (#23).
3. **Discovery UX:** category filters (#4), creatures in search (#5), arena cross-links (#13).
4. **Performance foundation:** recipe indexes (#6) before adding heavier features.
5. **Major features:** multi-item planner (#1), upgrade comparison (#11), reverse calculator (#36).

---

*Generated by site review on branch `cursor/nms-site-review-5b80`. Inspect referenced files before implementing; counts derived from `src/datav2/*.json` at review time.*
