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
		metaTitle: 'Products',
		idLabel: 'Product',
		description:
			"Browse No Man's Sky products with crafting ingredients, trade value, and advanced manufacturing chains.",
		pageDescription:
			"Browse No Man's Sky products, advanced components, and profitable crafting outputs with materials, uses, and page-by-page item listings.",
		intro:
			'Products include crafted components, trade goods, and advanced materials used throughout your journey.',
		datasets: ['Products'],
		idStrategy: 'props',
	},
	buildings: {
		slug: 'buildings',
		h1: 'Building Parts',
		metaTitle: 'Building Parts',
		idLabel: 'Building Part',
		description:
			"A list of building parts for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Building parts let you design and expand bases, decorations, and functional structures across the galaxy.',
		datasets: ['Buildings'],
		idStrategy: 'getById',
	},
	fish: {
		slug: 'fish',
		h1: 'Fish',
		metaTitle: 'Fish',
		idLabel: 'Fish Item',
		description:
			"A list of fish for No Man's Sky. Our guide has everything you need to take your game to the next level.",
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
			"A list of upgrade items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
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
			'Browse No Man\u2019s Sky raw materials used in crafting, refining, cooking, and upgrade chains. Track foundational resources, gather ingredients, and jump into the recipes they unlock.',
		pageIntro:
			"Raw materials are the foundation of crafting, refining, and upgrades in No Man's Sky.",
		datasets: ['RawMaterials'],
		idStrategy: 'props',
	},
	food: {
		slug: 'food',
		h1: 'Food',
		metaTitle: 'Food',
		idLabel: 'Food Item',
		description: "A list of food items for No Man's Sky. Browse all edible products and ingredients.",
		intro:
			"Food items power cooking recipes, consumables, and nutrient processing chains in No Man's Sky.",
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
			"A list of exocraft items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro: 'Exocraft items support planetary vehicles with fuel, modules, and specialized components.',
		datasets: ['Exocraft'],
		idStrategy: 'props',
	},
	starships: {
		slug: 'starships',
		h1: 'Starships',
		metaTitle: 'Starships',
		idLabel: 'Starship Item',
		description:
			"A list of starship items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Starship items include components, modules, and parts tied to spaceflight and starship management.',
		datasets: ['Starships'],
		idStrategy: 'props',
	},
	corvette: {
		slug: 'corvette',
		h1: 'Corvette Items',
		metaTitle: 'Corvette Items',
		idLabel: 'Corvette Item',
		description:
			"A list of corvette items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Corvette items cover freighter expedition systems, support gear, and mission-related components.',
		datasets: ['Corvette'],
		idStrategy: 'props',
	},
	curiosities: {
		slug: 'curiosities',
		h1: 'Curiosities',
		metaTitle: 'Curiosities',
		idLabel: 'Curiosity',
		description:
			"A list of curiosities for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Curiosities are unusual finds, relics, and special-use items gathered across planets and systems.',
		datasets: ['Curiosities'],
		idStrategy: 'props',
	},
	other: {
		slug: 'other',
		h1: 'Other Items',
		metaTitle: 'Other Items',
		idLabel: "No Man's Sky Item",
		description:
			"A list of other items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Other items include unique curios, mission items, and special resources that do not fit standard categories.',
		datasets: ['Others', 'Trade'],
		idStrategy: 'props',
	},
	technology: {
		slug: 'technology',
		h1: 'Technology',
		metaTitle: 'Technology Items',
		idLabel: 'Technology Item',
		description:
			"A list of technology items for No Man's Sky. Our guide has everything you need to take your game to the next level.",
		intro:
			'Technology items power your suit, ship, multitool, and base systems with specialized upgrades and devices.',
		datasets: ['ConstructedTechnology', 'Technology', 'TechnologyModule'],
		idStrategy: 'props',
		idSort: true,
		redirectGuard: true,
	},
};

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
	return categories[slug as CategorySlug];
}
