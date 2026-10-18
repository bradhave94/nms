# Design: No Man's Sky Recipes

The site is a fast reference that looks like it belongs to No Man's Sky. It uses the game's item icons and item colours, a deep-space ground, and the game's warm amber for anything you can act on. It should not look like a generic dashboard.

The 2026-10 critique and detector reports are in `.impeccable/critique/`. Approved mockups (desktop home, item page and Refining) are in `game-sites/_output/design/nms/mock/` (`after-*.png`, `home-full.html`, `item-full.html`, `refining.html`).

## Principles
1. **The answer comes first.** Every page shows its main answer in the first screen: the best recipe, the filtered table, the result. Ads and long lists come after it.
2. **The game's material, used with intent.**
   - Item icons appear in the game's inventory slot (`.slot`), tinted by the item's own `Colour`.
   - Refining, cooking and crafting rows keep their per-item colour swatches.
   - The keyart backgrounds in `public/images/backgrounds/` are only for heroes.
3. **One system everywhere.** The same surfaces, type and controls are used on every page type. There are no page-local palettes.
4. **No template tells:**
   - no tracked-caps eyebrow labels above headings;
   - no purple gradient bands;
   - no thick coloured side- or top-borders on rounded cards;
   - no identical card grids with a "View" button on each;
   - no pills for plain facts.

## Tokens (`src/assets/css/main.css` `@theme`)
**Surfaces**

| Token | Hex | Use |
|---|---|---|
| `space` | `#0b0f14` | Page ground |
| `panel` | `#121821` | Cards and panels |
| `panel-2` | `#0e141c` | Fields and table heads |
| `panel-3` | `#1a2330` | Hover |
| `line` | `#243041` | Borders |
| `line-strong` | `#3a4658` | Field borders (3:1) |

**Text**

| Token | Hex | Use |
|---|---|---|
| `ink` | `#e8eef5` | Body |
| `dim` | `#9fb0c3` | Secondary; at least 7:1 on panel |

Never go dimmer than `dim` for text.

**Accent**
- `accent` (`#ffc356`, the game's amber) marks primary actions, selection, active nav and key numbers. Text on it is `accent-ink` (`#1a1000`).
- `accent-strong` is for hover. `accent-line` is the hairline on highlighted panels.
- `glow` (`#8be9e0`) is the game's scanner teal. Use it rarely.

**Legacy utilities.** `blue-*` is remapped to the amber scale and `sky-*` to cool steel, so old utilities stay on-palette while pages are rewritten. New code uses the semantic tokens (`bg-panel`, `text-dim`, `border-line`, `bg-accent`), not `blue`, `sky` or `gray`.

**Focus.** One unlayered `:focus-visible` outline, 3px `#facc15`. Keep it.

## Type
- **Font.** Jost variable (self-hosted at `/fonts/Jost-latin*.woff2`, OFL). Use its real weights (400, 500, 600, 700). `font-synthesis: none` is set, so use only these weights.
- **Base size.** The root is 18px (`text-lg` on `<html>`).
- **Scale:**
  - h1: 2.25–3rem/1.05, weight 700
  - h2 (`.section-title`): 1.5rem, weight 600, with an optional `.count` in `dim`
  - h3: 1.15rem, weight 600
  - body: 1rem
  - small: .875rem
- **Line length.** Prose runs at most 68ch.
- **Case.** Sentence case everywhere. No `tracking-widest`, and no uppercase except the logo image.
- **Numbers.** Amounts, counts, times and prices use `.tabular`.

## Components (in `main.css` `@layer components`)
| Class | Use |
|---|---|
| `.panel` | Card or panel: 1px line, 14px radius |
| `.panel-amber` | The one highlighted answer box per page ("Best yield") |
| `.btn-primary` | Amber, 44px tall; one per view |
| `.btn-quiet` | Secondary; `aria-pressed="true"` turns amber, for segmented toggles |
| `.field` | Text inputs and selects, 44px |
| `.link` | Links inside sentences: amber and underlined |
| `.section-title` | h2 with an optional count |
| `.pill` | Facts like rarity or "88 units". Use sparingly |
| `.slot` | The game's inventory slot (see below) |

**The `.slot` markup:**

```html
<span class="slot" style="--c:#01387D"><img src=".../BLUE2.webp" alt=""><span class="qty">2</span></span>
```

Get the colour from the item's `Colour` field. Size it with a width class (`w-11`, `w-14`); the aspect ratio is 1.

**Swatches with text.** Text on a game-colour background must go through `swatchStyle()` / `readableTextOn()` (`src/utils/contrast.ts`).

**Recipe row.** Inputs and the output are slots with a quantity, joined by `+` and `→`, with the machine and time on the right. Sort rows by yield per input unit.

## Layout
- **Desktop sidebar.** 224px wide, holding:
  - the logo;
  - a search trigger (`[data-open-search]`, opens `SearchModal`);
  - Tools;
  - flyouts for Calculators and Catalogs;
  - More;
  - the 160×300 `nav-left` ad.
- **Mobile.** A top bar with the logo, a search button and the menu button.
- **Search.**
  - Any `[data-open-search]` element opens it. `data-open-search="text"` pre-fills the query.
  - A `form[data-search-form]` hands its input to the dialog.
  - There is no floating search button.
- **Content.** At most ~1180px wide inside `main`, with 16–48px side padding.
- **Footer.** Three link columns, the version line and the disclaimer. Bottom padding leaves room for the anchor ad.

## Ads (NitroPay) — keep revenue
**Count.** Every page keeps the same number of units as before: the global anchor, `nav-left` (160×300, desktop), and the in-page slot(s) listed below. Do not add units without asking. Do not remove `NitroAd` slots.

**Placement.** In-page slots sit after the first answer, still in the first desktop screen where possible, never above the answer.

| Page | Slot | Placement |
|---|---|---|
| Home | `home-after-hero` | After the three machine tiles |
| Item pages | `item-after-details` (336×280 / 300×250) | Top of the right column beside the recipes (desktop); after the best recipe (mobile) |
| Tables | `table-above` | After the first 5 rows (or under the filter bar when no rows) |
| Lists | `list-after-intro` | After the first row of results |
| Calculator | `calculator-after-intro` | After the first row of results |

**Reserved height.** Keep the reserved `minHeight` so layout shift stays 0.

## Accessibility (WCAG 2.2 AA) — see AGENTS.md
- One h1 per page, with no skipped heading levels.
- Only `Sidebar.astro` renders `<main>`.
- Targets are at least 24px, and 44px for primary controls.
- Status regions announce filter results.
- Dialogs trap focus and close on Escape.
- Tabulator tables call `applyTabulatorA11y()`.
- Respect reduced motion.

## Keep
These are what made the site feel hand-made:
- the game icons as the main imagery, shown at real size;
- the per-item colour swatches on refining and cooking rows;
- the Futura-style wordmark logo;
- the sidebar grouping (Tools, Calculators, Catalogs, More);
- the alliance portal glyphs and tag badges;
- the 404 page;
- the item FAQs, quantity multiplier, planner share links, and the `/` and Ctrl+K shortcuts;
- the category 3D renders on the home page;
- the AI blog heroes.
