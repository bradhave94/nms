# No Man's Sky Recipes: Impeccable critique, Assessment A (design review)

Method: Assessment A only (design review). It was kept isolated and the detector was not run. Live site https://nomansskyrecipes.com, checked 2026-10-18 with headless Chromium at 1440x900 and 390x844 (touch). Source: `nms-design` @ `design/impeccable` (= origin/main a0986598). There is no PRODUCT.md or DESIGN.md yet. Screenshots and scripts are in `game-sites/_output/design/nms/critique-A/`.

Mode: **Operate.** Visitors arrive to answer one question fast: "how do I make X?" or "what does X refine into?". Blog posts are **Read** pages.

## Design Health Score: 27/40 (top of "Acceptable")

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | The search modal shows only "Loading..." |
| 2 | Match system / real world | 3 | "Catalogs" and "Other" are site words; the "Calculator" page is really an item picker |
| 3 | User control and freedom | 3 | |
| 4 | Consistency and standards | 2 | Three visual dialects; form fields in the system font |
| 5 | Error prevention | 3 | |
| 6 | Recognition rather than recall | 2 | Search is an unlabelled floating button; recipe inputs are hidden; names are truncated |
| 7 | Flexibility and efficiency | 3 | `/` and Ctrl+K, quantity multiplier, planner share links |
| 8 | Aesthetic and minimalist design | 2 | 20 equal cards on home; empty ad gaps sit above the answer |
| 9 | Error recovery | 3 | The 404 is good |
| 10 | Help and documentation | 3 | |

## Design specificity verdict

The outside feedback is right: the site doesn't read as AI-made. It is built from the game's own materials.

**Authored, keep:**
- The game's item icons are everywhere.
- Refining rows are painted in each item's in-game `Colour`.
- The tool headers are a collage of the game's element cards.
- Futura and the spaced-caps wordmark.
- The alliance directory's portal glyphs and tag badges.
- The voice is a player's.

**Generic:**
- The stock Tailwind `blue-500`/`600` accent.
- The home page's 20 identical cards, each with a "View Recipes" button, plus the purple gradient strip.
- The stock "eyebrow, giant h1, cyan lede, navy cards" pattern on alliances, feedback, 404 and the blog.
- Tabulator's pagination, only lightly restyled.

**Missed:**
- The game's inventory-slot look: a rounded tile, a colour band and the amount at the bottom right.
- The C/B/A/S class and rarity colours.
- Analysis Visor scan-readout panels.
- The game's warm-white selected glow.

## Priority issues

1. **[P1] Item pages hide the answer.** Chromatic Metal's "How to refine" is 25 tiles that each say "Chromatic Metal [n]"; the inputs only appear when you open each accordion (`components/item/RefiningSection.astro:28-63`). A 280px ad slot (`layouts/Page.astro:484-494`) sits above it, so the first recipe is about 1500px down on a phone. The answer summary quotes one arbitrary low-yield recipe.
   - **Fix:** show open "A + B → C" rows sorted by yield, put the best recipe next to the icon, and move the ad after the first recipe.
2. **[P1] Search is hidden.** The only entry point is an unlabelled 44px floating button (`components/Search.astro:1-5`), and it covers CTAs and table columns.
   - In the modal, 14 chips fill half the phone screen (`SearchModal.astro:30-45`) and results are capped by `max-h-72`.
   - Searching "chromatic" returns Cadmium, Copper and Gold.
   - **Fix:** a search field in the sidebar, the mobile top bar and the home hero; chips behind a toggle; exact and prefix matches ranked first.
3. **[P1] The home page is a wall of 20 equal cards** (`pages/index.astro:7-168`). Every button says "View Recipes", the 250px ad sits straight under the hero, and there's no search on the page.
   - **Fix:** a key-art hero with search, then three machine tiles (Refiner, Nutrient Processor, Crafting), the calculators, a compact catalog strip, "New in Cosmos" and the latest guides.
4. **[P1] Broken data shows in catalogs.**
   - "%name% Implant/Node/Package" (`datav2/Products.json`, `Curiosities.json`, `new.json`).
   - "-null- Figurine" and the "'0'..'9' Decal" tiles lead /items.
   - Names are truncated, and some species are duplicated.
5. **[P2] Three visual dialects.**
   - The legacy black cards with blue buttons (`Card.astro:11,54`).
   - The slate item pages (`Page.astro:404`).
   - The navy newer pages (`alliances.css`).
   - Also, form fields don't inherit Futura (`main.css:1-4` has no preflight).
   - **Fix:** one token set, an accent from the game's amber and warm white, and `input, select, textarea { font: inherit }`.
6. **[P2] Tables don't fit phones.** Every column is at least 275px wide (`main.css:84,133`), so at 390px the Output column is off-screen. The pagination also wraps.
   - **Fix:** cards or stacked rows (output first) below 640px, and compact pagination.
7. **[P2] The calculator is a picker, and table search ignores paste.** /calculator is an unsorted grid with no search, and table search listens on `keyup` only (`components/table/Table.astro:298`).
   - **Fix:** open /calculator with search, sort the grid, and listen on `input`.
8. **[P3] Typography and copy.**
   - Only FuturaProBook is loaded (`main.css:69-76`), so every bold heading is synthesised faux bold.
   - Three words run together: "guideor" (`blog/index.astro:48`), "calculatoror" (`crafting-guide/index.astro:95`) and "guideand" (`items/index.astro:66`).

**Smaller:**
- Catalogs is a two-click flyout (`Sidebar.astro:624-690`).
- "Used in" lists run to 149 tiles: group them and show 12.
- The game's UI could go further: inventory-slot badges, class colours on rarity, a scan-readout stats panel.
- The same element-card collage heads every tool.
- The creatures hub repeats its cards.

## Personas
- **Phone player from Google:** the first recipe is about 1500px down behind an ad, the tiles are identical, and the table's Output column is off-screen.
- **First-timer:** 20 identical "View Recipes" cards, an icon-only search button, and "%name% Implant".
- **Power user:** likes the shortcuts, but search has no exact-match ranking, table search ignores paste, the default is 10 rows, and refine ratios can't be compared without opening every accordion.
- **Accessibility:** the base is strong. The floating search button covers content, and faux bold blurs large text.

## Keep
- Game icons and the in-game colour swatches.
- Futura and the wordmark.
- The sidebar grouping.
- Alliance glyphs.
- The 404 page, FAQs, quantity multiplier, planner share links, and `/` / Ctrl+K.
- The fast static build.
- The AI blog heroes.
- The colour-coded species table.
