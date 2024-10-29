import type { APIRoute } from 'astro';
import { getLabel, getSlug, sort } from '@utils/lookup.js';
import * as dataSources from '@data/index';

// Combine and sort all data
const data = sort(
  Object.values(dataSources).flatMap(source =>
    source.map(item => ({
      ...item,
      CraftingOutputAmount: item.CraftingOutputAmount || undefined
    }))
  )
);

// Create search data
const search = data.map((item) => ({
	id: item.fishId || item.Id,
	name: item.Name,
	type: getLabel(item.Id),
	url: `/${getSlug(item.Id)}/${item.fishId || item.Id}`.replace(/\/+/g, '/'),
}));

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.toLowerCase();

  const results = query
    ? search.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      )
    : search;

  return new Response(
    JSON.stringify({ body: results }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    }
  );
};