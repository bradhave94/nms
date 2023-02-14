// Importing data files
import raw from '../data/RawMaterials.json';
import products from '../data/Products.json';
import cooking from '../data/Cooking.json';
import curiosities from '../data/Curiosities.json';
import conTech from '../data/ConstructedTechnology.json';
import other from '../data/Others.json';
import refiner from '../data/Refinery.json';
import nut from '../data/NutrientProcessor.json';
import build from '../data/Buildings.json';

// Defining the interface for an Item
type Item = {
	Id: string;
	Name: string;
	Description: string;
	Group: string;
	Icon: string;
	Colour: string;
	BaseValueUnits: number;
	RequiredItems?: [];
	Quantity?: number;
	Output?: {
		Id: string;
		Quantity: number;
	};
};

// Mapping the prefixes of item id to the actual data sources
const dataSources = {
	raw,
	prod: products,
	cook: cooking,
	cur: curiosities,
	conTech,
	other,
	ref: refiner,
	nut: nut,
	build,
};

// Mapping the prefixes of item id to the corresponding slugs
const slugs = {
	raw: '/raw/',
	prod: '/products/',
	cook: '/cooking/',
	cur: '/curiosities/',
	conTech: '/constructed-technology/',
	other: '/others/',
	ref: '/refinery/',
	nut: '/nutrient-processor/',
	build: '/buildings/',
};

// Returns the slug corresponding to the item id
const getSlug = (id: string): string => {
	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0];
	// Return the slug corresponding to the prefix or "item" if prefix not found
	return slugs[prefix] || 'item';
};

// Returns the item corresponding to the id from a given data source
const findById = (source: Item[], id: string): Item => {
	// Find the item from the data source with a matching id
	return source.find((p) => p.Id === id);
};

const findOutput = (id: string) => {
	// Find the item from the data source with a matching id
	const outputs = [];
	for (const source in dataSources) {
		dataSources[source].forEach((item) => {
			if (item.Output && item.Output.Id === id) outputs.push(item);
		});
	}
	return outputs;
};

// Returns the item corresponding to the id from the appropriate data source
const getById = (id: string): Item => {
	// Extract the prefix of the item id by splitting the id by its numeric part
	const prefix = id.split(/\d/)[0];
	// Get the data source corresponding to the prefix
	const source = dataSources[prefix];
	// If source not found, return undefined
	if (!source) return;
	// Find the item from the source and return it
	return findById(source, id);
};

const getLength = (list) => {
	let length = dataSources[list].filter(
		(item) => !item.RequiredItems || item.RequiredItems.length != 0
	).length;
	return length;
};

const sort = (data) => {
	const sortData = data.sort((a, b) => {
		const nameA = a.Name.toUpperCase();
		const nameB = b.Name.toUpperCase();
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}
		return 0;
	});
	return sortData;
};

// Export the getSlug and getById functions, and the Item interface
export { getSlug, getById, findOutput, getLength, sort };
export type { Item };
