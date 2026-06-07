import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getSlug, sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

type SearchIndexEntry = {
	id: string;
	name: string;
	type: string;
	url: string;
	icon?: string;
	/** Extra text matched by search (not shown in the UI), e.g. blog meta description */
	searchText?: string;
};

function entryMatchesQuery(entry: SearchIndexEntry, query: string): boolean {
	const haystack = [entry.name, entry.searchText]
		.filter((part): part is string => typeof part === 'string' && part.trim() !== '')
		.join('\n')
		.toLowerCase();
	return haystack.includes(query) || entry.type.toLowerCase().includes(query);
}

const getTypeFromUrl = (url?: string): string => {
  if (!url) return 'item';
  const cleanUrl = url.replace(/^\/+/, '');
  const [prefix] = cleanUrl.split('/');
  return prefix || 'item';
};

// Combine and sort all data — only real item arrays (skip Creatures object, NewUpdate diff, etc.)
const allData = Object.values(dataSources).flatMap((source) =>
	Array.isArray(source) ? (source as Item[]) : []
);
const data = sort(allData);

// Build search index: only include items with a valid name so search and client filtering work
const itemSearchEntries: SearchIndexEntry[] = data
	.filter((item: Item) => item?.Name != null && String(item.Name).trim() !== '')
	.map((item: Item) => {
		const url = getSlug(item);
		return {
			id: item.Id,
			name: item.Name,
			type: getTypeFromUrl(url),
			url,
			icon: item.Icon,
		};
	});

const blogPosts: CollectionEntry<'blog'>[] = await getCollection('blog');
const blogSearchEntries: SearchIndexEntry[] = blogPosts
	.filter((post: CollectionEntry<'blog'>) => post.data.title != null && String(post.data.title).trim() !== '')
	.map((post: CollectionEntry<'blog'>) => ({
		id: `blog:${post.id}`,
		name: post.data.title,
		type: 'blog',
		url: `/blog/${post.id}`,
		searchText: post.data.description,
	}));

const search: SearchIndexEntry[] = [...itemSearchEntries, ...blogSearchEntries];

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.toLowerCase();

  const results = query ? search.filter((item) => entryMatchesQuery(item, query)) : search;

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