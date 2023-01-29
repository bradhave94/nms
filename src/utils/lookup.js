import raw from '../data/RawMaterials.json';
import products from '../data/Products.json';
import curiosities from '../data/Curiosity.json';
import conTech from '../data/ConstructedTechnology.json';

const getSlug = (id) => {
	if (id.includes('raw')) return '/raw/';
	if (id.includes('prod')) return '/products/';
	if (id.includes('cur')) return '/curiosities/';
	return 'item';
};

const getById = (id) => {
	if (id.includes('raw')) {
		return raw.find((p) => p.Id === id);
	} else if (id.includes('prod')) {
		return products.find((p) => p.Id === id);
	} else if (id.includes('cur')) {
		return curiosities.find((p) => p.Id === id);
	} else if (id.includes('conTech')) {
		return conTech.find((p) => p.Id === id);
	} else {
		return {
			Name: 'brad',
		};
	}
};

export { getSlug, getById };
