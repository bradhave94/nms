// Importing data files
import raw from '../datav2/RawMaterials.json';
import products from '../datav2/Products.json';
import cooking from '../datav2/Food.json';
import curiosities from '../datav2/Curiosities.json';
import fish from '../datav2/Fish.json';
import conTech from '../datav2/ConstructedTechnology.json';
import tech from '../datav2/Technology.json';
import tMod from '../datav2/TechnologyModule.json';
import other from '../datav2/Others.json';
import refiner from '../datav2/Refinery.json';
import nut from '../datav2/NutrientProcessor.json';
import build from '../datav2/Buildings.json';
import trade from '../datav2/Trade.json';
import upgrades from '../datav2/Upgrades.json';
import exocraft from '../datav2/Exocraft.json';
import starships from '../datav2/Starships.json';

export type RequiredItem = {
	Id: string;
	Quantity: number;
};

// Defining the interface for an Item
export type Item = {
	Id: string;
	Name: string;
	Description: string;
	Group: string;
	Icon: string;
	IconPath?: string;
	Slug?: string;
	Colour: string;
	BaseValueUnits: number;
	RequiredItems?: RequiredItem[];
	Quantity?: number;
	Output?: {
		Id: string;
		Quantity: number;
	};
	Value?: string;
};

type ItemWithOutput = {
	Id: string;
	Output: {
		Id: string;
		Quantity: number;
	};
};

type ItemWithInputs = {
	Id: string;
	Inputs: Array<{
		Id: string;
		Quantity: number;
	}>;
};

type TableItem = {
	output: {
		name: string;
	};
};

// Mapping the prefixes of item id to the actual data sources
const dataSources = {
	raw,
	prod: products,
	cook: cooking,
	cur: [...curiosities, ...fish],
	conTech,
	tech,
	tMod,
	other,
	ref: refiner,
	nut: nut,
	build,
	trade,
	upgrades,
	exocraft,
	starships,
};

// Mapping the prefixes of item id to the corresponding slugs
const slugs = {
	raw: 'raw/',
	prod: 'products/',
	cook: 'food/',
	cur: 'curiosities/',
	fish: 'fish/',
	conTech: 'technology/',
	tech: 'technology/',
	tMod: 'technology/',
	other: 'other/',
	ref: 'refinery/',
	nut: 'nutrient-processor/',
	build: 'buildings/',
	trade: 'other/',
	upgrades: 'upgrades/',
	exocraft: 'exocraft/',
};

const labels = {
	raw: 'Raw Materials',
	prod: 'Products',
	cook: 'Food',
	cur: 'Curiosities',
	fish: 'Fish',
	conTech: 'Technology',
	tech: 'Technology',
	tMod: 'Technology',
	other: 'Other',
	ref: 'Refinery',
	nut: 'Nutrient Processor',
	build: 'Buildings',
	trade: 'Other',
	upgrades: 'Upgrades',
	exocraft: 'Exocraft',
	starships: 'Starships',
};

const buildSlugFromId = (id: string): string => {
	const item = getById(id);
	if (item?.Slug) {
		const normalizedItemSlug = item.Slug.replace(/^\/?cooking\//, 'food/');
		return `/${normalizedItemSlug}`.replace(/\/+/g, '/');
	}

	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0] as keyof typeof slugs;
	const prefixSlug = slugs[prefix] || 'item/';
	return `/${prefixSlug}${id}`.replace(/\/+/g, '/');
};

type SlugItem = { Id: string; Slug?: string };

const getSlug = (itemOrId: SlugItem | string): string => {
	if (typeof itemOrId !== 'string') {
		if (itemOrId.Slug) {
			const normalizedItemSlug = itemOrId.Slug.replace(/^\/?cooking\//, 'food/');
			return `/${normalizedItemSlug}`.replace(/\/+/g, '/');
		}
		if (itemOrId.Id) {
			return buildSlugFromId(itemOrId.Id);
		}
		return '/item';
	}

	return buildSlugFromId(itemOrId);
};

type LabelItem = { Id: string; Slug?: string };

const slugLabels: Record<string, string> = {
	raw: 'Raw Materials',
	products: 'Products',
	food: 'Food',
	cooking: 'Food',
	curiosities: 'Curiosities',
	fish: 'Fish',
	technology: 'Technology',
	other: 'Other',
	refinery: 'Refinery',
	'nutrient-processor': 'Nutrient Processor',
	buildings: 'Buildings',
	upgrades: 'Upgrades',
	exocraft: 'Exocraft',
	starships: 'Starships',
};

// Returns the label corresponding to an item or id
const getLabel = (itemOrId: LabelItem | string): string => {
	const slug =
		typeof itemOrId === 'string'
			? (itemOrId.includes('/') ? itemOrId : undefined)
			: itemOrId.Slug;

	if (slug) {
		const slugPrefix = slug.split('/')[0];
		return slugLabels[slugPrefix] || 'item';
	}

	const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.Id;
	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0] as keyof typeof labels;
	// Return the slug corresponding to the prefix or "item" if prefix not found
	return labels[prefix] || 'item';
};


const findOutput = (id: string): ItemWithOutput[] => {
    const results: ItemWithOutput[] = [];
    for (const source of Object.values(dataSources)) {
        for (const item of source) {
            if ('Output' in item && item.Output?.Id === id) {
                results.push(item as unknown as ItemWithOutput);
            }
        }
    }
    return results;
};

const findInput = (id: string): ItemWithInputs[] => {
    const results: ItemWithInputs[] = [];
    for (const source of Object.values(dataSources)) {
        for (const item of source) {
            if ('Inputs' in item && Array.isArray(item.Inputs)) {
                for (const input of item.Inputs) {
                    if (input.Id === id) {
                        results.push(item as unknown as ItemWithInputs);
                        break; // Found match, move to next item
                    }
                }
            }
        }
    }
    return results;
};

// Returns the item corresponding to the id from the appropriate data source
const getById = (id: string): Item | undefined => {
	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0] as keyof typeof dataSources;
	// Get the data source corresponding to the prefix
	const source = dataSources[prefix];

	if (source) {
		// Find the item from the source
		const item = source.find((item) => item.Id === id);
		if (item) {
			// Return the found item (cast to Item since JSON structure doesn't match exactly)
			return item as Item;
		}
	}

	// Fallback: datav2 IDs don't always use prefixes, so scan all sources.
	for (const fallbackSource of Object.values(dataSources)) {
		const item = fallbackSource.find((item) => item.Id === id);
		if (item) {
			return item as Item;
		}
	}

	// If item not found, return undefined
	if (typeof window !== 'undefined' && import.meta.env.DEV) {
		console.warn(`Item not found: ${id}`);
	}
	return undefined;
};

const getLength = (list: keyof typeof dataSources): number => {
	// Filter out items that have empty RequiredItems (non-craftable items with no recipe)
	const length = dataSources[list].filter((item) => {
		// Include items that don't have RequiredItems property OR have a non-empty RequiredItems array
		return !('RequiredItems' in item) || !item.RequiredItems || item.RequiredItems.length > 0;
	}).length;
	return length;
};

const sort = (data: Item[]): Item[] => {
	// Create a copy to avoid mutating the original array
	return [...data].sort((a, b) => {
		const nameA = a?.Name?.toUpperCase() ?? '';
		const nameB = b?.Name?.toUpperCase() ?? '';
		return nameA.localeCompare(nameB);
	});
};

const sortTable = <T extends TableItem>(data: T[]): T[] => {
	// Create a copy to avoid mutating the original array
	return [...data].sort((a, b) => {
		const nameA = a?.output?.name?.toUpperCase() ?? '';
		const nameB = b?.output?.name?.toUpperCase() ?? '';
		return nameA.localeCompare(nameB);
	});
};

// Add findInput to the export statement
export { getSlug, getLabel, getById, findOutput, findInput, getLength, sort, sortTable };

// <(.*?)> - Match any character between < and >, and capture it
