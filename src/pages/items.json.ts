import type { APIRoute } from 'astro';
import { getSlug, sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

// Combine and sort all data
const allData = Object.values(dataSources).flatMap((source) => source as Item[]);
const data = sort(allData as Item[]);

// Map slug prefix to type for filtering
const getTypeFromSlug = (slug: string): string => {
	const prefix = slug.split('/')[1]?.split('/')[0] || '';
	const typeMap: Record<string, string> = {
		raw: 'raw',
		products: 'products',
		food: 'food',
		curiosities: 'curiosities',
		fish: 'fish',
		technology: 'technology',
		other: 'other',
		refinery: 'refinery',
		'nutrient-processor': 'food',
		buildings: 'buildings',
		upgrades: 'upgrades',
		exocraft: 'exocraft',
		starships: 'starships',
		corvette: 'corvette',
	};
	return typeMap[prefix] || prefix;
};

export const GET: APIRoute = ({ request }) => {
	const url = new URL(request.url);
	const group = url.searchParams.get('group');
	const type = url.searchParams.get('type');
	const q = url.searchParams.get('q')?.toLowerCase();

	let results = data.filter(
		(item: Item) => item?.Name != null && String(item.Name).trim() !== ''
	);

	if (group) {
		const groupNorm = group.trim();
		results = results.filter(
			(item) => item.Group && String(item.Group).trim() === groupNorm
		);
	}

	if (type) {
		const typeNorm = type.toLowerCase().trim();
		results = results.filter((item) => {
			const slug = getSlug(item);
			const itemType = getTypeFromSlug(slug);
			return itemType === typeNorm;
		});
	}

	if (q) {
		results = results.filter(
			(item) =>
				(item.Name && String(item.Name).toLowerCase().includes(q)) ||
				(item.Group && String(item.Group).toLowerCase().includes(q))
		);
	}

	const body = results.map((item) => ({
		id: item.Id,
		name: item.Name,
		icon: item.Icon,
		url: getSlug(item),
		group: item.Group,
	}));

	// Build unique groups and types from full dataset (for dropdown options)
	const groups = [...new Set(data.map((i) => i.Group).filter(Boolean))].sort();
	const types = [
		...new Set(
			data
				.filter((i) => i?.Name)
				.map((i) => getTypeFromSlug(getSlug(i)))
				.filter(Boolean)
		),
	].sort();

	return new Response(
		JSON.stringify({ body, groups, types }),
		{
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
		},
	}
	);
};
