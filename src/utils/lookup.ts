// Importing data files
import raw from '../data/RawMaterials.json';
import products from '../data/Products.json';
import curiosities from '../data/Curiosity.json';
import conTech from '../data/ConstructedTechnology.json';

// Defining the interface for an Item
type Item = {
	Id: string;
	Name: string;
	Description: string;
	Icon: string;
	Colour: string;
  BaseValueUnits: number;
};

// Mapping the prefixes of item id to the actual data sources
const dataSources = {
  raw,
  prod: products,
  cur: curiosities,
  conTech
};

// Mapping the prefixes of item id to the corresponding slugs
const slugs = {
  raw: '/raw/',
  prod: '/products/',
  cur: '/curiosities/'
};

// Returns the slug corresponding to the item id
const getSlug = (id: string ): string => {
  // Extract the prefix of the item id by splitting the id by its numeric part
  const prefix = id.split(/\d/)[0];
  // Return the slug corresponding to the prefix or "item" if prefix not found
  return slugs[prefix] || 'item';
};

// Returns the item corresponding to the id from a given data source
const findById = (source: Item[], id: string): Item => {
  // Find the item from the data source with a matching id
  return source.find(p => p.Id === id);
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

// Export the getSlug and getById functions, and the Item interface
export { getSlug, getById };
export type { Item };
