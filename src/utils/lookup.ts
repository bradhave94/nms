// Importing data files
import raw from '../data/RawMaterials.json';
import products from '../data/Products.json';
import cooking from '../data/Cooking.json';
import curiosities from '../data/Curiosities.json';
import fish from '../data/Fish.json';
import conTech from '../data/ConstructedTechnology.json';
import tech from '../data/Technology.json';
import tMod from '../data/TechnologyModule.json';
import other from '../data/Others.json';
import refiner from '../data/Refinery.json';
import nut from '../data/NutrientProcessor.json';
import build from '../data/Buildings.json';
import trade from '../data/Trade.json';

export type RequiredItem = {
	Id: string;
	Quantity: number;
};

// Defining the interface for an Item
export type Item = {
	Id: string;
	fishId?: string;
	Name: string;
	Description: string;
	Group: string;
	Icon: string;
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
};

// Mapping the prefixes of item id to the corresponding slugs
const slugs = {
	raw: '/raw/',
	prod: '/products/',
	cook: '/cooking/',
	cur: '/curiosities/',
	fish: '/fish/',
	conTech: '/technology/',
	tech: '/technology/',
	tMod: '/technology/',
	other: '/other/',
	ref: '/refinery/',
	nut: '/nutrient-processor/',
	build: '/buildings/',
	trade: '/other/',
};

const labels = {
	raw: 'Raw Materials',
	prod: 'Products',
	cook: 'Cooking',
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
};

const getSlug = (id: string): string => {
    // Extract the prefix of the item id by splitting the id by its numeric part
    const prefix = id.split(/\d/)[0] as keyof typeof slugs;

    // Special handling for 'cur' prefix
    if (prefix === 'cur') {
        const item = getById(id);
        if (item && 'fishId' in item) {
            return slugs['fish'];
        }
    }

    // Return the slug corresponding to the prefix or "item" if prefix not found
    return slugs[prefix] || 'item';
};

// Returns the label corresponding to the item id
const getLabel = (id: string): string => {
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

	// If source not found, return undefined
	if (!source) {
		if (typeof window !== 'undefined' && import.meta.env.DEV) {
			console.error(`No data source found for prefix: ${id} : ${prefix}`);
		}
		return undefined;
	}
	// Find the item from the source
	const item = source.find((item) => item.Id === id);
	// If item not found, return undefined
	if (!item) {
		if (typeof window !== 'undefined' && import.meta.env.DEV) {
			console.warn(`Item not found: ${id}`);
		}
		return undefined;
	}
	// Return the found item (cast to Item since JSON structure doesn't match exactly)
	return item as Item;
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
