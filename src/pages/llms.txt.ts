import type { APIRoute } from 'astro';
import { SITE } from '@config';

const getLlmsTxt = (base: string) => `# No Man's Sky Recipes

> Comprehensive guide to items, refining, crafting, and cooking in No Man's Sky. Find recipes, ingredients, and how to obtain any in-game item.

Data is current as of ${SITE.version_name} (${SITE.version_date}). Item pages include crafting trees, refiner recipes, and where each item is used.

## Guides

- [Refining](${base}/refining): Refiner recipes table – combine ingredients to produce outputs
- [Cooking](${base}/cooking): Nutrient Processor recipes – cook food from ingredients
- [Crafting Guide](${base}/crafting-guide): Craft products from blueprints and materials
- [Crafting Calculator](${base}/calculator): Calculate ingredients needed for any craftable item

## Categories

- [Products](${base}/products): Crafted tradeable items
- [Food](${base}/food): Edible items and cooking ingredients
- [Raw Materials](${base}/raw): Base resources (mined, harvested)
- [Technology](${base}/technology): Exosuit, multi-tool, exocraft, starship upgrades
- [Upgrades](${base}/upgrades): Inventory expansions and module enhancements
- [Exocraft](${base}/exocraft): Vehicle modules and upgrades
- [Starships](${base}/starships): Ship components and trade items
- [Buildings](${base}/buildings): Base building parts
- [Fish](${base}/fish): Aquatic catches
- [Curiosities](${base}/curiosities): Found items for selling or crafting
- [All Items](${base}/items): Browse all items with search and filters

## Sitemaps

- [Sitemap Index](${base}/sitemap-index.xml): Full list of indexed pages
- [Image Sitemap](${base}/image-sitemap.xml): List of images indexed by search engines
`;

export const GET: APIRoute = ({ site, url }) => {
	const base = (site ?? new URL('/', url)).toString().replace(/\/$/, '');
	return new Response(getLlmsTxt(base), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	});
};
