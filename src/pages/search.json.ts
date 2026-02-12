import type { APIRoute } from 'astro';
import { getSlug, sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

const getTypeFromUrl = (url?: string): string => {
  if (!url) return 'item';
  const cleanUrl = url.replace(/^\/+/, '');
  const [prefix] = cleanUrl.split('/');
  return prefix || 'item';
};

// Combine and sort all data (each datav2 export is an array of items)
const allData = Object.values(dataSources).flatMap((source) => source as Item[]);
const data = sort(allData as Item[]);

// Build search index: only include items with a valid name so search and client filtering work
const search = data
	.filter((item: Item) => item?.Name != null && String(item.Name).trim() !== '')
	.map((item: Item) => {
		const url = getSlug(item);
		return {
			id: item.Id,
			name: item.Name,
			type: getTypeFromUrl(url),
			url,
		};
	});

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.toLowerCase();

  const results = query
    ? search.filter(
        (item) =>
          (typeof item.name === 'string' && item.name.toLowerCase().includes(query)) ||
          (typeof item.type === 'string' && item.type.toLowerCase().includes(query))
      )
    : search;

  return new Response(
    JSON.stringify({ body: results }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min so data updates (e.g. new items) show up sooner
      },
    }
  );
};