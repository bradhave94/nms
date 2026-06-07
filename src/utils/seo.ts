import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

export type BreadcrumbItem = {
	name: string;
	href?: string;
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string => {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const normalizePath = (path: string): string => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const trimmedPath = normalizedPath.replace(/\/+$/, '');
	return trimmedPath === '' ? '/' : trimmedPath;
};

type ItemMetaInput = Pick<Item, 'Id' | 'Name' | 'Description' | 'Group' | 'Slug'>;

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

const buildDescriptionHint = (item: ItemMetaInput): string | undefined => {
	const normalizedDescription = normalizeDescriptionHint(item.Description);
	if (!normalizedDescription) return undefined;

	const firstClause = normalizedDescription.split(/[.!?]/)[0]?.trim() ?? normalizedDescription;
	if (!firstClause) return undefined;

	return truncate(firstClause, 72);
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
		return group;
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

const buildItemTitle = (item: ItemMetaInput, categoryLabel: string, uniquenessHint?: string): string => {
	const titleSegments = [item.Name];

	if (uniquenessHint) {
		titleSegments.push(uniquenessHint);
	}

	titleSegments.push(categoryLabel, "No Man's Sky Recipes");
	return titleSegments.join(' | ');
};

export const buildItemMeta = (
	item: ItemMetaInput,
	categoryLabel: string
): { title: string; description: string } => {
	const normalizedDescription = normalizeDescriptionHint(item.Description) ?? '';
	const uniquenessHint = buildItemUniquenessHint(item, categoryLabel);
	const title = buildItemTitle(item, categoryLabel, uniquenessHint);
	const itemTypeLabel = resolveItemTypeLabel(item);
	const descriptiveType =
		uniquenessHint && uniquenessHint !== itemTypeLabel
			? `${uniquenessHint.toLowerCase()} ${itemTypeLabel.toLowerCase()}`
			: itemTypeLabel.toLowerCase();
	const duplicateCount = itemNameCounts.get(normalizeWhitespace(item.Name ?? '').toLowerCase()) ?? 0;
	const descriptionHint = duplicateCount > 1 ? buildDescriptionHint(item) : undefined;
	const baseDescription = descriptionHint
		? `Learn how to craft, refine, use, and unlock ${item.Name}, a ${descriptiveType} in No Man's Sky. ${descriptionHint}.`
		: `Learn how to craft, refine, use, and unlock ${item.Name}, a ${descriptiveType} in No Man's Sky.`;
	const description = truncate(
		normalizeWhitespace(`${baseDescription} ${normalizedDescription}`),
		155
	);
	return { title, description };
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
	const title =
		currentPage > 1
			? `${label} - Page ${currentPage} | No Man's Sky Recipes`
			: `${label} | No Man's Sky Recipes`;
	const description =
		currentPage > 1
			? `Page ${currentPage} of ${lastPage}. ${baseDescription}`
			: baseDescription;
	return { title, description };
};

const normalizePrevHref = (href?: string): string | undefined => {
	if (!href) return href;
	const normalized = href.replace(/\/1\/?$/, '');
	return normalized === '' ? '/' : normalized;
};

export const buildPaginationUrls = (
	siteOrigin: string,
	page: { url: { prev?: string; next?: string } }
): { prevUrl?: string; nextUrl?: string } => {
	const prevHref = normalizePrevHref(page.url.prev);
	const prevUrl = prevHref ? new URL(prevHref, siteOrigin).toString() : undefined;
	const nextUrl = page.url.next ? new URL(page.url.next, siteOrigin).toString() : undefined;
	return { prevUrl, nextUrl };
};
