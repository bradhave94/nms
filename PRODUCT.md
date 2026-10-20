# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
No Man's Sky players. Most arrive from Google mid-session, often on a phone or a second screen, with one question:
- "how do I make X?"
- "what does X refine into?"
- "what can I cook with Y?"
- "how many of Z do I need?"

They want the answer and then go back to the game. Returning players use the calculators (planner, reverse, farm, base power), the refining and cooking tables, the alliance directory and the guides.

## Product purpose
A complete, exact No Man's Sky crafting, refining and cooking reference, built from the game files, plus calculators on the same data. It succeeds when a player gets the exact recipe faster than on the wiki.

## Brand
- **Name:** No Man's Sky Recipes (nomansskyrecipes.com). Unofficial; No Man's Sky is © Hello Games.
- **Look and feel:** it should feel like part of No Man's Sky without copying the in-game UI exactly. Use the game's icons, item colours and keyart.
- **Not AI-made:** outside feedback in 2026 said the owner's other four sites looked AI-made, but this one did not. Keep the parts that made it feel hand-made (see DESIGN.md "Keep").
- **Ads:** they pay for the site, so every redesign keeps the same units per page (see DESIGN.md).
- **Blog images:** keep the AI-generated blog hero images; the owner likes them.

## Evidence on hand
- Game data: `src/datav2/` (hash-checked; display fixes live in `src/integrations/cleanGameNames.ts`).
- Icons: `public/images/items/`.
- Keyart: `public/images/backgrounds/`.

There are no testimonials or traffic numbers. Don't invent any.

## Principles
1. The answer comes first.
2. Exact over approximate: every number comes from the data.
3. Use the game's own material with intent.
4. Keep revenue: same ad units, placed after the answer.
5. WCAG 2.2 AA must not regress.
