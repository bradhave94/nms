---
name: nms-blog-images
description: >-
  Generate hero images for No Man's Sky Recipes blog posts with a consistent
  art style. Use when creating, regenerating, or updating blog post hero images
  for the NMS site, or when the user mentions blog images, hero images, or
  thumbnails for nomansskyrecipes.com.
---

# NMS Blog Image Generation

## Art Style

All blog hero images follow a unified style:

- **Genre**: Dark, cinematic sci-fi digital art inspired by the No Man's Sky universe
- **Palette**: Deep darks with vibrant accent glows — cyan, teal, magenta, gold, or purple depending on subject
- **Lighting**: Dramatic, moody lighting with neon/energy glow as the primary light source
- **Composition**: Wide 16:9 aspect ratio, landscape orientation
- **Detail level**: High detail, painterly digital art (not photorealistic, not pixel art)
- **Atmosphere**: Alien, mysterious, space-exploration mood

## Hard Rules

- **No humans.** No Man's Sky characters wear full helmets and space suits — if a figure must appear, it should be a helmeted astronaut in a bulky suit, never a visible face or skin.
- **No watermarks or branding.** Don't include film studio logos, stock photo watermarks, or fake brand names (e.g. "NMS" stamped in a corner). Contextual in-scene text like UI labels, crafting tree diagrams, or alien signage is fine and encouraged when it fits the subject.
- **Use in-game item icons as reference images** when available. Item PNGs live in `public/images/items/`. Pass them via the `reference_image_paths` parameter so the generated art faithfully represents the actual game asset. To find an item's icon filename, search the JSON files in `src/datav2/` for the item name and read its `"Icon"` field.
- **File format**: `.webp`, saved to `public/images/blog/`.

## Image Types

Two proven styles for blog hero images:

1. **Scene images** — An environment-focused shot (workshop, planet surface, space station) with the subject item or activity as the centerpiece. Good for guides and general topics.
2. **Crafting tree diagrams** — A visual crafting tree with the final product at the top, branching down through sub-components. Each node should resemble the actual in-game icon. Pass all component item icons as reference images. Good for "How to Craft X" posts.

## Prompt Template

When generating, follow this structure:

```
A sci-fi themed hero image for a blog post about [TOPIC] in a space
exploration game. [CENTRAL SUBJECT DESCRIPTION, referencing the in-game item
if a reference image was provided]. [ENVIRONMENT/SETTING — alien workshop,
planet surface, space station, freighter interior, etc.]. [LIGHTING AND COLOR
NOTES — which accent colors dominate]. The scene has NO people, NO humans —
[if a figure is needed: only a helmeted astronaut in a full space suit]. Dark
cinematic atmosphere, digital art style. Wide aspect ratio (16:9). No
watermarks, no branding.
```

## Existing Image Inventory

| Blog Post | Image Path | Reference Item |
|-----------|-----------|----------------|
| Best Refiner Recipes | `public/images/blog/refiner-recipes.webp` | `BUILD_REFINER2.png` |
| Best Nanite Farms | `public/images/blog/nanite-farms.webp` | — |
| Fusion Ignitor vs Stasis Device | `public/images/blog/fusion-vs-stasis.webp` | — |
| Gravitino Coil Guide | `public/images/blog/gravitino-coil.webp` | — |
| How to Craft Fusion Ignitor | `public/images/blog/craft-fusion-ignitor.webp` | `ULTRAPROD1.png` |
| How to Craft Stasis Device | `public/images/blog/craft-stasis-device.webp` | `ULTRAPROD2.png` |
| How to Make Units Fast | `public/images/blog/make-units-fast.webp` | `UNITS.png` |
| Is NMS Worth It 2026 | `public/images/blog/is-nms-worth-it-2026.webp` | — |

## Frontmatter Integration

Each blog post in `src/content/blog/*.md` has an optional `heroImage` field:

```yaml
heroImage: "/images/blog/your-image-name.webp"
```

After generating a new image, update the post's frontmatter to point to it.
