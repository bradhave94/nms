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
