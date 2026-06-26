import { findOutput } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import { createArray } from '@utils/recipeTree';
import type { RecipeOutput } from '@utils/recipeTree';
import type { ItemPageSchemaInput } from '@utils/itemPageSchema';

export type ItemPageSchemaContext = Omit<ItemPageSchemaInput, 'dateModified'>;

const categoryNameMap: Record<string, string> = {
	raw: 'Raw Materials',
	products: 'Products',
	food: 'Food',
	curiosities: 'Curiosities',
	fish: 'Fish',
	technology: 'Technology',
	other: 'Other',
	refinery: 'Refinery',
	buildings: 'Buildings',
	upgrades: 'Upgrades',
	exocraft: 'Exocraft',
	starships: 'Starships',
	corvette: 'Corvette',
};

const categoryFirstPagePathMap: Record<string, string> = {
	raw: '/raw',
	products: '/products',
	food: '/food',
	curiosities: '/curiosities',
	fish: '/fish',
	technology: '/technology',
	other: '/other',
	buildings: '/buildings',
	upgrades: '/upgrades',
	exocraft: '/exocraft',
	starships: '/starships',
	corvette: '/corvette',
};

const categorySingularMap: Record<string, string> = {
	raw: 'raw material',
	products: 'product',
	food: 'food item',
	curiosities: 'curiosity',
	fish: 'fish',
	technology: 'technology item',
	other: 'item',
	buildings: 'building part',
	upgrades: 'upgrade',
	exocraft: 'exocraft item',
	starships: 'starship item',
	corvette: 'corvette item',
	refinery: 'refined item',
};

export const prepareItemPageSchemaInput = (
	item: Item,
	siteOrigin: string,
	pathname: string,
): ItemPageSchemaContext => {
	const canonicalUrl = new URL(pathname, siteOrigin).toString();
	const normalizedSlug = (item.Slug ?? '').replace(/^\/+/, '').replace(/^cooking\//, 'food/');
	const categorySlug = normalizedSlug.split('/')[0] || 'items';
	const categoryName = categoryNameMap[categorySlug] ?? 'Items';
	const categorySingular = categorySingularMap[categorySlug] ?? 'item';
	const categoryPath = categoryFirstPagePathMap[categorySlug] ?? '/items';
	const categoryUrl = `${siteOrigin}${categoryPath}`;
	const itemImageUrl = `${siteOrigin}/images/items/${item.Icon}`;
	const isFoodItem = Boolean(item.Slug?.startsWith('food/') || item.Slug?.startsWith('cooking/'));

	const { rawItems } = createArray(item);
	const dataLength = item.RequiredItems?.length ? 1 : 0;
	const outputRecipes = findOutput(item.Id) as unknown as RecipeOutput[];

	let outputRefinedLength = 0;
	let outputCookedLength = 0;
	for (const entry of outputRecipes) {
		if (entry.Slug?.startsWith('nutrient-processor/')) {
			outputCookedLength += 1;
		} else {
			outputRefinedLength += 1;
		}
	}

	return {
		item,
		categoryName,
		categorySingular,
		categoryUrl,
		siteOrigin,
		canonicalUrl,
		itemImageUrl,
		isFoodItem,
		outputRecipes,
		rawItems,
		dataLength,
		outputRefinedLength,
		outputCookedLength,
	};
};
