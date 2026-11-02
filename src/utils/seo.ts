import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

export type BreadcrumbItem = {
	name: string;
	href?: string;
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** Cuts at the last word boundary that fits, never mid-word. */
const truncate = (value: string, maxLength: number): string => {
	if (value.length <= maxLength) return value;
	const head = value.slice(0, maxLength - 1);
	const endsAtWord = /\s/.test(value.charAt(maxLength - 1));
	const cut = (endsAtWord ? head : head.replace(/\s+\S*$/, '')).replace(/[\s,;:–-]+$/, '');
	return `${cut}…`;
};

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;
const GAME_NAME = /No Man['’]?s Sky|\bNMS\b/i;

const splitSentences = (text: string): string[] =>
	text
		.split(/(?<=[.!?]["”’)]?)\s+/)
		.map((sentence) => sentence.trim())
		.filter(Boolean)
		.map((sentence) => (/[.!?]["”’)]?$/.test(sentence) ? sentence : `${sentence}.`));

/** Adds whole sentences of `extra` to `base` while the result fits in a meta description. */
const appendSentences = (base: string, extra: string, maxLength = DESCRIPTION_MAX): string => {
	let result = base;
	for (const sentence of splitSentences(extra)) {
		const next = `${result} ${sentence}`;
		if (next.length > maxLength) break;
		result = next;
	}
	return result;
};

const normalizePath = (path: string): string => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	if (normalizedPath === '/') return '/';
	return `${normalizedPath.replace(/\/+$/, '')}/`;
};

type ItemMetaInput = Pick<Item, 'Id' | 'Name' | 'Description' | 'Group' | 'Slug'>;

export type ItemRelatedLink = {
	label: string;
	href: string;
};

export type IntroSegment = {
	text: string;
	href?: string;
};

type ItemMetaOverride = {
	title?: string;
	description?: string;
	relatedLinks?: ItemRelatedLink[];
	/**
	 * "Where to find" paragraphs, shown under an h2 on the item page. `[label](/path/)` becomes a link.
	 * Only facts from src/datav2 (in-game text, refiner and Nutrient Processor recipes) or a cited
	 * source (noted beside each entry). Never guess where an item spawns.
	 */
	whereToFind?: string[];
};

const SITE_TITLE_SUFFIX = " | No Man's Sky Recipes";

/** Adds the site name, unless the title already names the game and the suffix would push it past 60 characters. */
export const withSiteTitle = (title: string): string => {
	const full = `${title}${SITE_TITLE_SUFFIX}`;
	return full.length > TITLE_MAX && GAME_NAME.test(title) ? title : full;
};

const ITEM_META_OVERRIDES: Record<string, ItemMetaOverride> = {
	PLANT_TOXIC: {
		title: 'Fungal Mold NMS Recipe (Mould)',
		description:
			'Fungal Mold (Fungal Mould) NMS: harvest from fungal clusters, refine and cook it, plus the Fusion Ignitor chain that spends 600x of this crop.',
		relatedLinks: [
			{
				label: 'Fusion Ignitor vs Stasis Device',
				href: '/blog/fusion-ignitor-vs-stasis-device-no-mans-sky/',
			},
		],
	},
	TRA_ALLOY5: {
		title: 'Superconducting Fiber NMS (Fibre)',
		description:
			'Superconducting Fiber (Fibre) NMS: how to get this trade good, what it sells for, and every recipe or use tied to Superconducting Fibre.',
		relatedLinks: [{ label: 'all products', href: '/products/' }],
	},
	FRIG_BOOST_TRA: {
		title: 'Mind Control Device (NMS): Crafting Recipe and Uses',
		description:
			'Craft the Mind Control Device from 1 Solar Mirror and 50 Gold. This one-expedition frigate upgrade helps the Fleet Commander in trading negotiations.',
	},
	// Where-to-find copy: GSC 2026-10 showed these at position 8-9 with almost no clicks.
	// Facts: in-game descriptions and recipes in src/datav2 unless noted.
	GAS3: {
		title: 'Nitrogen NMS: Where to Find It and How to Refine It',
		description:
			"Where to find Nitrogen in No Man's Sky: harvest it from Lush and Toxic planet atmospheres, or refine it from Radon or Methane. Every Nitrogen recipe.",
		whereToFind: [
			"The game's own text says Nitrogen is readily harvested from the atmospheres of Lush and Toxic planets. If you're on one of those, that's your source.",
			'Anywhere else, refine it. 3 [Radon](/products/GAS2/) or 3 [Methane](/products/GAS4/) make 1 Nitrogen in a Portable Refiner. In a Medium Refiner, 1 Radon or Methane plus 1 [Oxygen](/raw/OXYGEN/) also makes 1, so you spend a third of the gas.',
			'Per their in-game text, Radon comes from Radioactive and Frozen atmospheres, and Methane from equipment deployed on gas worlds.',
		],
	},
	ASTEROID3: {
		title: 'Platinum NMS: Where to Find It and How to Farm It',
		description:
			"Where to find Platinum in No Man's Sky: mine asteroids, dig underground deposits, or refine Gold and Silver. Plus the alloys that break down into 250.",
		whereToFind: [
			'Platinum is typically mined from asteroids and occasionally found in underground planetary deposits, per its in-game text. Asteroids are the reliable source.',
			'To refine it, 1 [Gold](/raw/ASTEROID2/) plus 1 [Silver](/raw/ASTEROID1/) makes 1 Platinum in a Medium Refiner. Gold and Silver are asteroid minerals too, so one mining run covers all three.',
			'The big payout is breaking down alloys: 1 [Geodesite](/products/ALLOY7/) or 1 [Iridesite](/products/ALLOY8/) refines into 250 Platinum. A Large Refiner also turns 1 [Ferrite Dust](/raw/LAND1/), 1 [Oxygen](/raw/OXYGEN/) and 250 [Chromatic Metal](/raw/STELLAR2/) into 10 Platinum.',
			'Base value is 505 Units each, so spare Platinum sells well.',
		],
	},
	SPACEGUNK2: {
		title: 'Runaway Mould NMS: Where to Find and Farm It',
		description:
			"Where to find Runaway Mould in No Man's Sky: Curious Deposits, trade terminals, and the Living Slime refine. 5 Runaway Mould refine into 1 Nanite Cluster.",
		relatedLinks: [{ label: 'Best nanite farms', href: '/blog/best-nanite-farms-no-mans-sky/' }],
		// Curious Deposits and trade terminals: Fandom "Runaway Mould", revid 1335203.
		whereToFind: [
			'Mine it from Curious Deposits on some planets. The Runaway Mould shows up as a sphere that rolls when you mine the deposit. Galactic Trade Terminals also buy and sell it.',
			'You can also refine it: 1 [Living Slime](/raw/SPACEGUNK4/) makes 1 Runaway Mould, and 1 [Atlantideum](/raw/ROBOT2/) plus 1 [Pugneum](/curiosities/ROBOT1/) makes 3 in a Medium Refiner.',
			'Why bother: 5 Runaway Mould refine into 1 [Nanite Cluster](/other/TECHFRAG/). The [nanite farm guide](/blog/best-nanite-farms-no-mans-sky/) has the full loop.',
		],
	},
	FOOD_R_MEAT: {
		title: 'Processed Meat NMS: How to Make It and Where to Get Meat',
		description:
			"Processed Meat in No Man's Sky: put any of 18 raw creature meats in a Nutrient Processor. Where the meat comes from, and every dish that uses it.",
		whereToFind: [
			"You don't find Processed Meat lying around. You make it: 1 raw meat in a [Nutrient Processor](/technology/COOKER/) makes 1 Processed Meat.",
			'18 raw meats work, including [Meaty Chunks](/food/FOOD_M_MEAT/), [Raw Steak](/food/FOOD_M_COW/), Meaty Wings, Diplo Chunks and Scaly Meat. The game describes every one of them as harvested from the corpse of the creature that once contained it, so you get them from hunting creatures.',
			'Processed Meat is a stepping stone. Stews, pies and Smoked Meat start from it, listed below.',
		],
	},
	WATERWORLD1: {
		title: 'Lithium NMS: Where to Find It (Purple Star Systems)',
		description:
			"Where to find Lithium in No Man's Sky: ocean planets in purple star systems only, or refine Quartzite and Crystallised Helium. Every Lithium recipe.",
		relatedLinks: [{ label: 'How to get Lithium', href: '/blog/how-to-get-lithium-no-mans-sky/' }],
		whereToFind: [
			"Lithium only shows up in purple star systems, and its in-game text says it's typically found on ocean planets. Look for large deposits, or scan mineral formations with the Analysis Visor and harvest them.",
			"Already in a purple system? 1 [Quartzite](/raw/PURPLE2/) plus 1 [Crystallised Helium](/raw/GASGIANT1/) makes 1 Lithium in a Medium Refiner, and [Activated Quartzite](/raw/EX_PURPLE/) makes 2.",
			'Purple systems need the [Atlantid Drive](/upgrades/HDRIVEBOOST4/). The [Lithium guide](/blog/how-to-get-lithium-no-mans-sky/) covers the unlock.',
		],
	},
	GASGIANT1: {
		title: 'Crystallised Helium NMS: Where to Find It (Crystallized)',
		description:
			"Where to find Crystallised Helium in No Man's Sky: deposits on gas giants, or refine Quartzite and Lithium. Every recipe that makes or uses it.",
		whereToFind: [
			"Crystallised Helium comes from gas giants. Its in-game text says it's extracted from deposits formed in their hostile conditions: large deposits, or smaller mineral formations you spot with the Analysis Visor.",
			'Or refine it: 1 [Quartzite](/raw/PURPLE2/) plus 1 [Lithium](/raw/WATERWORLD1/) makes 1 in a Medium Refiner, or 2 with [Activated Quartzite](/raw/EX_PURPLE/).',
			'Quartzite and Lithium both come from purple star systems, so that route only helps once you can reach them. See the [Lithium guide](/blog/how-to-get-lithium-no-mans-sky/).',
		],
	},
	// Where-to-find copy: GSC 2026-10-03 to 2026-10-30, CTR under 0.6% at position 6-8.
	// Facts: in-game descriptions, pin text, and recipes in src/datav2.
	STELLAR2: {
		title: 'Chromatic Metal NMS: How to Make It (Refiner Recipes)',
		description:
			"How to make Chromatic Metal in No Man's Sky: refine Copper, Cadmium, Emeril, Indium, or Quartzite. 2 Indium or 2 Quartzite makes 4.",
		relatedLinks: [
			{
				label: 'How to make Chromatic Metal',
				href: '/blog/how-to-make-chromatic-metal-no-mans-sky/',
			},
		],
		whereToFind: [
			'Chromatic Metal is made in a Refiner, not mined. Its in-game text says it comes from the stellar metals Copper, Cadmium, Emeril and Indium, and that the rarer the metal, the more Chromatic Metal it produces. The [how to make Chromatic Metal](/blog/how-to-make-chromatic-metal-no-mans-sky/) guide picks which recipe to run.',
			'2 [Copper](/raw/YELLOW2/) makes 1 (planets orbiting yellow stars). 2 [Cadmium](/raw/RED2/) makes 1 (red stars), 2 [Emeril](/raw/GREEN2/) makes 3 (green), and 2 [Indium](/raw/BLUE2/) makes 4 (blue). 2 [Quartzite](/raw/PURPLE2/) makes 4 (purple stars). 1 [Activated Copper](/raw/EX_YELLOW/), 1 [Activated Emeril](/raw/EX_GREEN/), 1 [Activated Indium](/raw/EX_BLUE/), or 1 [Activated Quartzite](/raw/EX_PURPLE/) makes the same as 2 of that plain metal. 1 [Activated Cadmium](/raw/EX_RED/) makes 2.',
			'In a Medium Refiner, 1 plain metal plus 1 [Pure Ferrite](/raw/LAND2/) makes 1 from Copper, 2 from Cadmium, 3 from Emeril, 4 from Indium, and 4 from Quartzite. A Large Refiner turns 1 [Silver](/raw/ASTEROID1/), 1 [Gold](/raw/ASTEROID2/) and 1 Indium or Quartzite into 30.',
		],
	},
	PLANT_POOP: {
		title: 'Faecium NMS: Where to Get It and How to Farm It',
		description:
			"Where to get Faecium in No Man's Sky: harvest a Gutrot Flower, feed creatures, or refine Mordite. One Faecium plus Oxygen makes three.",
		whereToFind: [
			'Faecium comes from the [Gutrot Flower](/products/POOPPLANT/), or, as the item text puts it, less desirably from the faecal matter of some species. Feeding creatures encourages faecium crystals.',
			'To farm it, plant Gutrot Flowers in a Hydroponics Tray. The plant text says they yield Faecium and take about 4 hours to grow, which replaces feeding creatures and harvesting their droppings.',
			'To refine it, 3 [Mordite](/raw/CREATURE1/) makes 1 Faecium. In a Medium Refiner, 1 Faecium plus 1 [Oxygen](/raw/OXYGEN/) makes 3, and 1 [Di-hydrogen](/raw/LAUNCHSUB/) plus 1 [Carbon](/raw/FUEL1/) makes 1.',
		],
	},
	LAUNCHSUB2: {
		title: 'Deuterium NMS: How to Make It and Refine It',
		description:
			"How to make Deuterium in No Man's Sky: refine Di-hydrogen with Tritium or Silicate Powder in a multi-input refiner. It very rarely occurs naturally.",
		whereToFind: [
			'Deuterium very rarely occurs naturally. Its in-game text says most of the supply comes from processing Di-hydrogen and Tritium in a Refiner.',
			'The pin text names both recipes: process [Di-hydrogen](/raw/LAUNCHSUB/) with [Tritium](/raw/ROCKETSUB/) or [Silicate Powder](/raw/SAND1/) in a multi-input refiner. Each one is 1 plus 1, and it makes 1 Deuterium.',
			'Di-hydrogen is the large blue crystals common to all worlds. Tritium is mined from asteroids. Silicate Powder comes from the Terrain Manipulator on rocky worlds.',
		],
	},
	ROCKETSUB: {
		title: 'Tritium NMS: Where to Find It (Asteroids)',
		description:
			"Where to find Tritium in No Man's Sky: mine it from asteroids with starship weapons. Scan in space for tritium-rich asteroids in planetary rings.",
		whereToFind: [
			'Tritium is abundant in interstellar asteroid fields. Mine it from asteroids with starship weaponry, and scan for tritium-rich asteroids, per its in-game text.',
			'The pin text adds that those fields sit in rings around planets, or at intervals during interstellar flight. No refiner recipe outputs Tritium.',
		],
	},
	ALLOY1: {
		title: 'Aronium NMS: How to Make It (Recipe and Value)',
		description:
			"How to make Aronium in No Man's Sky: craft 50 Paraffinium and 50 Ionised Cobalt, or refine it in a Large Refiner. Base value is 25,000 Units.",
		whereToFind: [
			'Aronium is crafted from 50 [Paraffinium](/raw/LUSH1/) and 50 [Ionised Cobalt](/raw/CAVE2/). Its text calls it a lightweight alloy in high demand on the Galactic Trade Network. Base value is 25,000 Units.',
			'Paraffinium is typically found on planets with a tropical environment, in large deposits or in common minerals you inspect with the Analysis Visor.',
			'A Large Refiner makes it too. 30 Paraffinium and 30 Ionised Cobalt, plus 5 [Platinum](/raw/ASTEROID3/), 10 [Gold](/raw/ASTEROID2/), 20 [Silver](/raw/ASTEROID1/), or 20 [Tritium](/raw/ROCKETSUB/), makes 1. Each of those also works with 60 [Cobalt](/raw/CAVE1/) instead of the Ionised Cobalt. The pin text says refining this alloy needs a Large Refiner.',
		],
	},
	LAND1: {
		title: 'Ferrite Dust NMS: Where to Find It and How to Make It',
		description:
			"Where to find Ferrite Dust in No Man's Sky: mine rocks with the Mining Laser, or refine 1 local mineral into 1 Ferrite Dust. Rusted Metal makes 2.",
		whereToFind: [
			'Ferrite Dust is found in rock formations and other geological spots, and extracted with a Mining Laser, per its in-game text. The pin text says to harvest it from small rocks.',
			'A Refiner can make it too. 1 [Paraffinium](/raw/LUSH1/), [Pyrite](/raw/DUSTY1/), [Ammonia](/raw/TOXIC1/), [Uranium](/raw/RADIO1/), [Dioxite](/raw/COLD1/), [Phosphorus](/raw/HOT1/), [Crystallised Helium](/raw/GASGIANT1/), or [Lithium](/raw/WATERWORLD1/) makes 1 Ferrite Dust. 1 [Rusted Metal](/raw/SPACEGUNK3/) makes 2.',
		],
	},
	HOT1: {
		title: 'Phosphorus NMS: Where to Find It and How to Make It',
		description:
			"Where to find Phosphorus in No Man's Sky: large deposits on scorched planets, or refine Dioxite, Solanium and Salt, or Methane and Di-hydrogen.",
		whereToFind: [
			'Phosphorus is typically found in large deposits, or in common minerals you inspect with an Analysis Visor, on planets with a scorched environment. The pin text says common ferrite rocks may yield it after that inspection.',
			'To refine it in a Medium Refiner, 2 [Dioxite](/raw/COLD1/) plus 1 [Ferrite Dust](/raw/LAND1/) or 1 [Pure Ferrite](/raw/LAND2/) makes 1. 2 [Solanium](/raw/PLANT_HOT/) plus 1 [Salt](/raw/WATER1/) makes 1. 1 [Methane](/products/GAS4/) plus 1 [Di-hydrogen](/raw/LAUNCHSUB/) makes 1.',
		],
	},
	BAIT_BASIC: {
		title: 'Creature Pellets NMS: How to Make Them (Recipe)',
		description:
			"How to make Creature Pellets in No Man's Sky. The crafting recipe is 60 Carbon, and a Nutrient Processor turns 1 Carbon into 1 pellet.",
		whereToFind: [
			'Creature Pellets are made, not found. The crafting recipe is 60 [Carbon](/raw/FUEL1/). The Mining Laser harvests Carbon from trees, plants, and other vegetation.',
			'A [Nutrient Processor](/technology/COOKER/) makes them too: 1 Carbon makes 1 Creature Pellet. Other Prepare Bait recipes use 1 [Mordite](/raw/CREATURE1/) plus a raw meat, or 1 [Faecium](/raw/PLANT_POOP/) plus a harvested plant.',
			'The item text says this bait attracts creatures and makes them yield Faecium. Once a creature has been fed, it may be tamed or farmed, and dropping bait may calm an angry one.',
		],
	},
	// Links only. Generated titles and descriptions stay in place.
	AM_HOUSING: {
		relatedLinks: [
			{
				label: 'How to craft Antimatter Housing',
				href: '/blog/how-to-craft-antimatter-housing-no-mans-sky/',
			},
		],
	},
	GRAVITYGUN: {
		relatedLinks: [
			{ label: 'Gravitino Coil guide', href: '/blog/gravitino-coil-guide-no-mans-sky/' },
			{ label: 'Gravitino Ball', href: '/curiosities/GRAVBALL/' },
		],
	},
	AF_METAL: {
		relatedLinks: [{ label: 'Best nanite farms', href: '/blog/best-nanite-farms-no-mans-sky/' }],
	},
	TECHFRAG: {
		relatedLinks: [{ label: 'Best nanite farms', href: '/blog/best-nanite-farms-no-mans-sky/' }],
	},
};

export const parseIntroLinks = (intro: string): IntroSegment[] => {
	const segments: IntroSegment[] = [];
	const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null = linkPattern.exec(intro);

	while (match) {
		if (match.index > lastIndex) {
			segments.push({ text: intro.slice(lastIndex, match.index) });
		}
		segments.push({ text: match[1], href: match[2] });
		lastIndex = linkPattern.lastIndex;
		match = linkPattern.exec(intro);
	}

	if (lastIndex < intro.length) {
		segments.push({ text: intro.slice(lastIndex) });
	}

	return segments;
};

const normalizeCategoryLabel = (value: string | undefined): string =>
	normalizeWhitespace(value ?? '')
		.toLowerCase()
		.replace(/^no man's sky\s+/i, '')
		.replace(/^no mans sky\s+/i, '');

const resolveItemTypeLabel = (item: ItemMetaInput): string => {
	const normalizedSlug = (item.Slug ?? '').replace(/^\/+/, '');
	const category = normalizedSlug.split('/')[0] ?? '';
	const categoryLabelMap: Record<string, string> = {
		raw: 'Raw Material',
		products: 'Product',
		food: 'Food Recipe',
		curiosities: 'Curiosity',
		fish: 'Fish',
		technology: 'Technology',
		other: 'Item',
		buildings: 'Building Part',
		upgrades: 'Upgrade Module',
		exocraft: 'Exocraft Upgrade',
		starships: 'Starship Upgrade',
		corvette: 'Corvette Part',
	};

	return categoryLabelMap[category] ?? item.Group ?? 'Item';
};

const buildSlugHint = (item: ItemMetaInput): string | undefined => {
	const normalizedSlug = (item.Slug ?? '').replace(/^\/+/, '');
	if (!normalizedSlug) return undefined;

	const slugSegment = normalizedSlug.split('/').pop() ?? '';
	if (!slugSegment) return undefined;
	const readableSlug = slugSegment
		.replace(/[-_]+/g, ' ')
		.trim()
		.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());

	if (!readableSlug) return undefined;
	if (readableSlug.toLowerCase() === item.Id.toLowerCase()) return undefined;

	return readableSlug;
};

const normalizeDescriptionHint = (value: string | undefined): string | undefined => {
	const normalized = normalizeWhitespace(value ?? '');
	if (!normalized) return undefined;

	const cleaned = normalized
		.replace(/%[A-Z0-9_]+%/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (!cleaned) return undefined;
	return cleaned;
};

const buildDescriptionHint = (item: ItemMetaInput, maxLength: number): string | undefined => {
	const normalizedDescription = normalizeDescriptionHint(item.Description);
	if (!normalizedDescription) return undefined;

	const firstClause = normalizedDescription.split(/[.!?]/)[0]?.trim() ?? normalizedDescription;
	if (!firstClause || maxLength < 20) return undefined;

	return firstClause.length + 1 <= maxLength ? `${firstClause}.` : truncate(firstClause, maxLength - 1);
};

const allItems = Object.values(dataSources).flatMap((source) =>
	Array.isArray(source) ? (source as ItemMetaInput[]) : []
);

const itemNameCounts = allItems.reduce<Map<string, number>>((counts, item) => {
	const normalizedName = normalizeWhitespace(item?.Name ?? '').toLowerCase();
	if (!normalizedName) return counts;
	counts.set(normalizedName, (counts.get(normalizedName) ?? 0) + 1);
	return counts;
}, new Map());

const itemsByNormalizedName = allItems.reduce<Map<string, ItemMetaInput[]>>((groups, item) => {
	const normalizedName = normalizeWhitespace(item?.Name ?? '').toLowerCase();
	if (!normalizedName) return groups;
	const items = groups.get(normalizedName) ?? [];
	items.push(item);
	groups.set(normalizedName, items);
	return groups;
}, new Map());

const hasPlaceholderTokens = (value: string): boolean => /%[^%]+%/.test(value);

const buildUniqueHintFromSiblings = (
	item: ItemMetaInput,
	siblings: ItemMetaInput[],
	candidateBuilder: (candidate: ItemMetaInput) => string | undefined
): string | undefined => {
	const candidate = candidateBuilder(item);
	if (!candidate) return undefined;

	const normalizedCandidate = normalizeWhitespace(candidate).toLowerCase();
	if (!normalizedCandidate) return undefined;

	const candidateMatches = siblings.filter((sibling) => {
		const siblingCandidate = candidateBuilder(sibling);
		return normalizeWhitespace(siblingCandidate ?? '').toLowerCase() === normalizedCandidate;
	});

	return candidateMatches.length === 1 ? candidate : undefined;
};

const buildItemUniquenessHint = (item: ItemMetaInput, categoryLabel: string): string | undefined => {
	const normalizedName = normalizeWhitespace(item.Name ?? '').toLowerCase();
	const duplicateCount = itemNameCounts.get(normalizedName) ?? 0;
	if (duplicateCount <= 1) {
		return undefined;
	}

	const siblings = itemsByNormalizedName.get(normalizedName) ?? [item];
	const normalizedCategoryLabelValue = normalizeCategoryLabel(categoryLabel);

	const categoryHint = buildUniqueHintFromSiblings(item, siblings, (candidate) => {
		const resolvedLabel = resolveItemTypeLabel(candidate);
		const normalizedResolvedLabel = normalizeCategoryLabel(resolvedLabel);
		if (!normalizedResolvedLabel || normalizedResolvedLabel === normalizedCategoryLabelValue) {
			return undefined;
		}
		return resolvedLabel;
	});

	if (categoryHint) {
		return categoryHint;
	}

	const groupHint = buildUniqueHintFromSiblings(item, siblings, (candidate) => {
		const group = normalizeWhitespace(candidate.Group ?? '');
		if (!group) return undefined;
		if (group.toLowerCase() === normalizedName) return undefined;
		if (hasPlaceholderTokens(group)) return undefined;
		// Some groups are decorated, e.g. ":: Datestamp 22516.01 ::"
		return group.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '') || undefined;
	});

	if (groupHint) {
		return groupHint;
	}

	const slugHint = buildUniqueHintFromSiblings(item, siblings, (candidate) => buildSlugHint(candidate));
	if (slugHint) {
		return slugHint;
	}

	return `ID ${item.Id}`;
};

// Name | [hint |] category | site. The category goes first when the title runs past 60 characters.
const buildItemTitle = (item: ItemMetaInput, categoryLabel: string, uniquenessHint?: string): string => {
	const titleSegments = [item.Name];

	if (uniquenessHint) {
		titleSegments.push(uniquenessHint);
	}

	const full = [...titleSegments, categoryLabel, "No Man's Sky Recipes"].join(' | ');
	if (full.length <= TITLE_MAX) return full;
	return [...titleSegments, "No Man's Sky Recipes"].join(' | ');
};

export const buildItemMeta = (
	item: ItemMetaInput,
	categoryLabel: string
): { title: string; description: string; relatedLinks?: ItemRelatedLink[]; whereToFind?: string[] } => {
	const override = ITEM_META_OVERRIDES[item.Id];
	if (override?.title && override.description) {
		return {
			title: withSiteTitle(override.title),
			description: override.description,
			...(override.relatedLinks ? { relatedLinks: override.relatedLinks } : {}),
			...(override.whereToFind ? { whereToFind: override.whereToFind } : {}),
		};
	}

	const normalizedDescription = normalizeDescriptionHint(item.Description) ?? '';
	const uniquenessHint = buildItemUniquenessHint(item, categoryLabel);
	const title = buildItemTitle(item, categoryLabel, uniquenessHint);
	const itemTypeLabel = resolveItemTypeLabel(item);
	const descriptiveType =
		uniquenessHint && uniquenessHint !== itemTypeLabel
			? `${uniquenessHint.toLowerCase()} ${itemTypeLabel.toLowerCase()}`
			: itemTypeLabel.toLowerCase();
	const duplicateCount = itemNameCounts.get(normalizeWhitespace(item.Name ?? '').toLowerCase()) ?? 0;
	const baseDescription = truncate(
		`Learn how to craft, refine, use, and unlock ${item.Name}, ${/^[aeiou]/i.test(descriptiveType) ? 'an' : 'a'} ${descriptiveType} in No Man's Sky.`,
		DESCRIPTION_MAX
	);
	// Whole sentences of the in-game description, so the snippet is never cut mid-word.
	let description = appendSentences(baseDescription, normalizedDescription);
	const room = DESCRIPTION_MAX - baseDescription.length - 1;
	const firstSentence = splitSentences(normalizedDescription)[0];
	if (description === baseDescription && firstSentence && room >= 40) {
		// The first sentence is too long to fit: cut it at a word boundary.
		description = `${baseDescription} ${truncate(firstSentence, room)}`;
	} else if (description === baseDescription && duplicateCount > 1) {
		// Same-named items need some of their own text to stay unique.
		const hint = buildDescriptionHint(item, DESCRIPTION_MAX - baseDescription.length - 1);
		if (hint) description = `${baseDescription} ${hint}`;
	}
	return {
		title,
		description,
		...(override?.relatedLinks ? { relatedLinks: override.relatedLinks } : {}),
		...(override?.whereToFind ? { whereToFind: override.whereToFind } : {}),
	};
};

export const buildCategoryBreadcrumbs = (
	categoryName: string,
	categoryPath: string,
	currentPage: number,
	firstPagePath?: string
): BreadcrumbItem[] => {
	const resolvedFirstPagePath = firstPagePath
		? normalizePath(firstPagePath)
		: normalizePath(categoryPath);
	if (currentPage > 1) {
		return [
			{ name: 'Home', href: '/' },
			{ name: categoryName, href: resolvedFirstPagePath },
			{ name: `Page ${currentPage}` },
		];
	}

	return [
		{ name: 'Home', href: '/' },
		{ name: categoryName },
	];
};

export const buildCategoryIntro = (
	baseIntro: string,
	currentPage: number,
	lastPage: number
): string => {
	if (currentPage <= 1) return baseIntro;
	return `${baseIntro} Page ${currentPage} of ${lastPage}.`;
};

export const buildPaginatedMeta = (
	label: string,
	baseDescription: string,
	currentPage: number,
	lastPage: number
): { title: string; description: string } => {
	const title = withSiteTitle(currentPage > 1 ? `${label} - Page ${currentPage}` : label);
	const description =
		currentPage > 1
			? `Page ${currentPage} of ${lastPage}. ${baseDescription}`
			: baseDescription;
	return { title, description };
};

const normalizePrevHref = (href?: string): string | undefined => {
	if (!href) return href;
	const normalized = href.replace(/\/1\/?$/, '');
	return normalized === '' ? '/' : normalizePath(normalized);
};

export const buildPaginationUrls = (
	siteOrigin: string,
	page: { url: { prev?: string; next?: string } }
): { prevUrl?: string; nextUrl?: string } => {
	const prevHref = normalizePrevHref(page.url.prev);
	const prevUrl = prevHref ? new URL(prevHref, siteOrigin).toString() : undefined;
	const nextHref = page.url.next ? normalizePath(page.url.next) : undefined;
	const nextUrl = nextHref ? new URL(nextHref, siteOrigin).toString() : undefined;
	return { prevUrl, nextUrl };
};
