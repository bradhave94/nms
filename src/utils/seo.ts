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

const allItems = Object.values(dataSources).flatMap((source) =>
	Array.isArray(source) ? (source as ItemMetaInput[]) : []
);

const itemNameCounts = allItems.reduce<Map<string, number>>((counts, item) => {
	const normalizedName = normalizeWhitespace(item?.Name ?? '').toLowerCase();
	if (!normalizedName) return counts;
	counts.set(normalizedName, (counts.get(normalizedName) ?? 0) + 1);
	return counts;
}, new Map());

const buildItemUniquenessHint = (item: ItemMetaInput, categoryLabel: string): string | undefined => {
	const normalizedName = normalizeWhitespace(item.Name ?? '').toLowerCase();
	const duplicateCount = itemNameCounts.get(normalizedName) ?? 0;
	if (duplicateCount <= 1) {
		return undefined;
	}

	const categoryHint = resolveItemTypeLabel(item);
	const normalizedCategoryHint = normalizeCategoryLabel(categoryHint);
	const normalizedCategoryLabelValue = normalizeCategoryLabel(categoryLabel);
	if (normalizedCategoryHint && normalizedCategoryHint !== normalizedCategoryLabelValue) {
		return categoryHint;
	}

	if (item.Group && normalizeWhitespace(item.Group).toLowerCase() !== normalizedName) {
		return item.Group;
	}

	return buildSlugHint(item) ?? `ID ${item.Id}`;
};

const buildItemTitle = (item: ItemMetaInput, categoryLabel: string): string => {
	const titleSegments = [item.Name];
	const uniquenessHint = buildItemUniquenessHint(item, categoryLabel);

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
	const normalizedDescription = normalizeWhitespace(item.Description ?? '');
	const title = buildItemTitle(item, categoryLabel);
	const itemTypeLabel = resolveItemTypeLabel(item);
	const uniquenessHint = buildItemUniquenessHint(item, categoryLabel);
	const descriptiveType =
		uniquenessHint && uniquenessHint !== itemTypeLabel
			? `${uniquenessHint.toLowerCase()} ${itemTypeLabel.toLowerCase()}`
			: itemTypeLabel.toLowerCase();
	const baseDescription = `Learn how to craft, refine, use, and unlock ${item.Name}, a ${descriptiveType} in No Man's Sky.`;
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
