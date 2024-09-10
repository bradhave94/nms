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
type Item = {
	Id: string;
	fishId?: string;
	Name: string;
	Description: string;
	Group: string;
	Icon: string;
	Colour: string;
	BaseValueUnits: number;
	RequiredItems?: Item[];
	Quantity?: number;
	Output?: {
		Id: string;
		Quantity: number;
	};
	Value?: string;
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
    const prefix = id.split(/\d/)[0];

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
	const prefix = id.split(/\d/)[0];
	// Return the slug corresponding to the prefix or "item" if prefix not found
	return labels[prefix] || 'item';
};

// Returns the item corresponding to the id from a given data source
const findById = (source: Item[], id: string): Item => {
	// Find the item from the data source with a matching id
	return source.find((p) => p.Id === id);
};

const findOutput = (id: string): Item[] => {
    return Object.values(dataSources).flatMap(source =>
        source.filter(item => item.Output?.Id === id)
    );
};

const findInput = (id: string): Item[] => {
    return Object.values(dataSources).flatMap(source =>
        source.filter(item => item.Inputs?.some(input => input.Id === id))
    );
};

// Returns the item corresponding to the id from the appropriate data source
const getById = (id: string): Item | undefined => {
	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0];
	// Get the data source corresponding to the prefix
	const source = dataSources[prefix];

	// If source not found, log an error and return undefined
	if (!source) {
		console.error(`No data source found for prefix: ${prefix}`);
		return undefined;
	}
	// Find the item from the source
	const item = source.find((item) => item.Id === id);
	// If item not found, log a warning and return undefined
	if (!item) {
		console.warn(`Item not found: ${id}`);
		return undefined;
	}
	// Return the found item
	return item;
};

const getLength = (list) => {
	let length = dataSources[list].filter((item) => !item.RequiredItems || item.RequiredItems.length != 0).length;
	return length;
};

const sort = (data) => {
	const sortData = data.sort((a, b) => {
		const nameA = a?.Name?.toUpperCase() ?? '';
		const nameB = b?.Name?.toUpperCase() ?? '';
		return nameA.localeCompare(nameB);
	});
	return sortData;
};

const sortTable = (data) => {
	return data.sort((a, b) => {
		const nameA = a?.output?.name?.toUpperCase() ?? '';
		const nameB = b?.output?.name?.toUpperCase() ?? '';
		return nameA.localeCompare(nameB);
	});
};

// Add findInput to the export statement
export { getSlug, getLabel, getById, findOutput, findInput, getLength, sort, sortTable };
export type { Item };

// <(.*?)> - Match any character between < and >, and capture it