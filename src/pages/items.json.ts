import type { APIRoute } from 'astro';
import { sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import { getRouteEligibleCatalog } from '@utils/routeCatalog.js';

const routeEntries = getRouteEligibleCatalog();
const routeEntryById = new Map(routeEntries.map((entry) => [String(entry.item.Id), entry]));
const data = sort(routeEntries.map(({ item }) => item as unknown as Item));

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
		creatures: 'creatures',
	};
	return typeMap[prefix] || prefix;
};

export const GET: APIRoute = ({ request }) => {
	const url = new URL(request.url);
	const siteOrigin = `${url.protocol}//${url.host}`;
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
			const slug = routeEntryById.get(String(item.Id))?.url ?? '';
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
		url: routeEntryById.get(String(item.Id))!.url,
		group: item.Group,
	}));

	// Build unique groups and types from full dataset (for dropdown options)
	const groups = [...new Set(data.map((i) => i.Group).filter(Boolean))].sort();
	const types = [
		...new Set(
			data
				.filter((i) => i?.Name)
				.map((i) => getTypeFromSlug(routeEntryById.get(String(i.Id))?.url ?? ''))
				.filter(Boolean)
		),
	].sort();
	const datasetJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		'@id': `${siteOrigin}/items.json#dataset`,
		name: "No Man's Sky Items Dataset",
		description: 'Structured list of item names, groups, icons, and URLs used by No Man\'s Sky Recipes.',
		url: `${siteOrigin}/items.json`,
		isAccessibleForFree: true,
		inLanguage: 'en',
		creator: {
			'@type': 'Organization',
			name: "No Man's Sky Recipes",
			url: `${siteOrigin}/`,
		},
		distribution: {
			'@type': 'DataDownload',
			contentUrl: `${siteOrigin}/items.json`,
			encodingFormat: 'application/json',
		},
	};

	return new Response(
		JSON.stringify({
			...datasetJsonLd,
			body,
			groups,
			types,
		}),
		{
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
		},
	}
	);
};
