export type DatasetKey =
	| 'Products'
	| 'Buildings'
	| 'Fish'
	| 'Upgrades'
	| 'RawMaterials'
	| 'Food'
	| 'Exocraft'
	| 'Starships'
	| 'Corvette'
	| 'Curiosities'
	| 'Others'
	| 'Trade'
	| 'ConstructedTechnology'
	| 'Technology'
	| 'TechnologyModule';

export type IdStrategy = 'props' | 'getById';

export interface CategoryConfig {
	slug: string;
	h1: string;
	metaTitle: string;
	idLabel: string;
	description: string;
	pageDescription?: string;
	intro: string;
	pageIntro?: string;
	datasets: DatasetKey[];
	idStrategy: IdStrategy;
	idSort?: boolean;
	redirectGuard?: boolean;
	firstPagePath?: string;
}

export const CATEGORY_SLUGS = [
	'products',
	'buildings',
	'fish',
	'upgrades',
	'raw',
	'food',
	'exocraft',
	'starships',
	'corvette',
	'curiosities',
	'other',
	'technology',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const categories: Record<CategorySlug, CategoryConfig> = {
	products: {
		slug: 'products',
		h1: 'Products',
		metaTitle: 'NMS Products Database & Craft Chains',
		idLabel: 'Product',
		description:
			"Search No Man's Sky craftable products and components. Open each page for ingredients, unit values, and full manufacturing chains.",
		pageDescription:
			"Search No Man's Sky craftable products and components. Open each page for ingredients, unit values, and full manufacturing chains.",
		intro:
			'Crafted components, trade goods and advanced materials. See the [crafting guide](/crafting-guide/), [crafting calculator](/calculator/), [refiner recipes](/refining/) and [all items](/items/).',
		datasets: ['Products'],
		idStrategy: 'props',
	},
	buildings: {
		slug: 'buildings',
		h1: 'Building Parts',
		metaTitle: 'Building Parts',
		idLabel: 'Building Part',
		description:
			"Every No Man's Sky building part: base structures, decorations, freighter rooms and orbital base modules. Open each part for its build cost.",
		intro:
			'Building parts let you design and expand bases, decorations, and functional structures across the galaxy.',
		datasets: ['Buildings'],
		idStrategy: 'getById',
	},
	fish: {
		slug: 'fish',
		h1: 'Fish',
		metaTitle: 'NMS Fish List',
		idLabel: 'Fish Item',
		description:
			"Every fish you can catch in No Man's Sky. Open each catch for its biome, size, quality, weather and the recipes that use it.",
		intro:
			'Fish items include aquatic catches, bait outcomes, and ocean-specific resources used in recipes.',
		datasets: ['Fish'],
		idStrategy: 'props',
	},
	upgrades: {
		slug: 'upgrades',
		h1: 'Upgrades',
		metaTitle: 'Upgrades',
		idLabel: 'Upgrade Module',
		description:
			"No Man's Sky upgrade modules for exosuit, multi-tool, starship, exocraft and freighter technology. Open each module for its stat ranges.",
		intro: 'Upgrade modules boost stats for your equipment, vehicles, and freighter systems.',
		datasets: ['Upgrades'],
		idStrategy: 'props',
	},
	raw: {
		slug: 'raw',
		h1: 'Raw Materials',
		metaTitle: 'Raw Materials',
		idLabel: 'Raw Material',
		description:
			"Browse No Man's Sky raw materials, foundational resources, and ingredient pages for crafting, refining, cooking, and upgrade chains.",
		pageDescription:
			"Browse No Man's Sky raw materials, base resources, and mining ingredients used in crafting, refining, cooking, and technology upgrades.",
		intro:
			'The resources behind every crafting, refining, cooking and upgrade chain in No Man\u2019s Sky. Open one for the recipes it unlocks.',
		pageIntro:
			"Raw materials are the foundation of crafting, refining, and upgrades in No Man's Sky.",
		datasets: ['RawMaterials'],
		idStrategy: 'props',
	},
	food: {
		slug: 'food',
		h1: 'Food',
		metaTitle: 'NMS Food Recipes & Cooking Guide',
		idLabel: 'Food Item',
		description:
			"No Man's Sky food recipes and cooking ingredients. Browse edible products, nutrient processor recipes, and cooking chains from bait to baked goods.",
		intro:
			"Food items power [cooking recipes](/cooking/), consumables, and nutrient processing chains in No Man's Sky.",
		datasets: ['Food'],
		idStrategy: 'props',
		firstPagePath: '/food',
	},
	exocraft: {
		slug: 'exocraft',
		h1: 'Exocraft',
		metaTitle: 'Exocraft',
		idLabel: 'Exocraft Item',
		description:
			"No Man's Sky exocraft items: vehicle technology, modules and components. Open each page for craft costs and the recipes they appear in.",
		intro: 'Exocraft items support planetary vehicles with fuel, modules, and specialized components.',
		datasets: ['Exocraft'],
		idStrategy: 'props',
	},
	starships: {
		slug: 'starships',
		h1: 'Starships',
		metaTitle: 'NMS Starship Parts List & Wings',
		idLabel: 'Starship Item',
		description:
			"NMS starship parts: wings, cockpits and engines for fighter, hauler, explorer and solar ships. Break ships down at a space station's Starship Outfitting unit.",
		intro:
			'Starship items include components, modules, and parts tied to spaceflight and starship management. See [technology upgrades](/technology/) and [corvette parts](/corvette/).',
		datasets: ['Starships'],
		idStrategy: 'props',
	},
	corvette: {
		slug: 'corvette',
		h1: 'Corvette Items',
		metaTitle: 'NMS Corvette Parts & Modules',
		idLabel: 'Corvette Item',
		description:
			"Browse every No Man's Sky Corvette part: cockpits, reactors, engines, weapons, and hab modules. Open each page for craft or salvage details.",
		intro:
			'Corvette parts are the modular pieces you assemble at the Corvette Workshop. See the [Corvette guide](/blog/no-mans-sky-corvette-guide/) and [all items](/items/).',
		datasets: ['Corvette'],
		idStrategy: 'props',
	},
	curiosities: {
		slug: 'curiosities',
		h1: 'Curiosities',
		metaTitle: 'NMS Curiosities & Special Items',
		idLabel: 'Curiosity',
		description:
			"Browse No Man's Sky curiosities: relics, special finds, and unique items. Open each page for uses, recipes, and related guides.",
		intro:
			'Curiosities are unusual finds, relics, and special-use items gathered across planets and systems. See [all items](/items/) and [Gravitino Ball](/curiosities/GRAVBALL/).',
		datasets: ['Curiosities'],
		idStrategy: 'props',
	},
	other: {
		slug: 'other',
		h1: 'Other Items',
		metaTitle: 'Other Items',
		idLabel: "No Man's Sky Item",
		description:
			"Other No Man's Sky items: mission items, trade goods, curios and special resources. Open each page for its uses and related recipes.",
		intro:
			'Other items include unique curios, mission items, and special resources that do not fit standard categories.',
		datasets: ['Others', 'Trade'],
		idStrategy: 'props',
	},
	technology: {
		slug: 'technology',
		h1: 'Technology',
		metaTitle: 'NMS Technology & Suit Upgrades',
		idLabel: 'Technology Item',
		description:
			"Browse No Man's Sky technology for exosuit, multi-tool, ship, and base systems. Open each page for craft costs and upgrade modules.",
		intro:
			'Technology items power your suit, ship, multitool, and base systems with specialized upgrades and devices. See [upgrades](/upgrades/) and the [crafting guide](/crafting-guide/).',
		datasets: ['ConstructedTechnology', 'Technology', 'TechnologyModule'],
		idStrategy: 'props',
		idSort: true,
		redirectGuard: true,
	},
};

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
	return categories[slug as CategorySlug];
}
