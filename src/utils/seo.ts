import type { Item } from '@utils/lookup.js';

export type BreadcrumbItem = {
	name: string;
	href?: string;
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string => {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

export const buildItemMeta = (
	item: Pick<Item, 'Id' | 'Name' | 'Description'>,
	categoryLabel: string
): { title: string; description: string } => {
	const normalizedDescription = normalizeWhitespace(item.Description ?? '');
	const title = `${item.Name} (${item.Id}) | ${categoryLabel} | No Man's Sky Recipes`;
	const baseDescription = `Learn how to craft, refine, and use ${item.Name} (${item.Id}), a ${categoryLabel.toLowerCase()} in No Man's Sky.`;
	const description = truncate(
		normalizeWhitespace(`${baseDescription} ${normalizedDescription}`),
		175
	);
	return { title, description };
};

export const buildCategoryBreadcrumbs = (
	categoryName: string,
	categoryPath: string,
	currentPage: number
): BreadcrumbItem[] => {
	const normalizedPath = categoryPath.startsWith('/') ? categoryPath : `/${categoryPath}`;
	if (currentPage > 1) {
		return [
			{ name: 'Home', href: '/' },
			{ name: categoryName, href: normalizedPath },
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
