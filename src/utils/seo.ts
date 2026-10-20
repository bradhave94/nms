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
	SPACEGUNK2: {
		relatedLinks: [{ label: 'Best nanite farms', href: '/blog/best-nanite-farms-no-mans-sky/' }],
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
): { title: string; description: string; relatedLinks?: ItemRelatedLink[] } => {
	const override = ITEM_META_OVERRIDES[item.Id];
	if (override?.title && override.description) {
		return {
			title: withSiteTitle(override.title),
			description: override.description,
			...(override.relatedLinks ? { relatedLinks: override.relatedLinks } : {}),
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
