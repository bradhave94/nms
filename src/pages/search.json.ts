import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getSlug, sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

type RecipeForSearch = {
	Inputs?: { Name?: string | null }[];
	Output?: { Id?: string; Name?: string | null } | null;
	Operation?: string | null;
};

function buildRecipeSearchTokensByOutputId(
	recipes: RecipeForSearch[]
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();

	for (const recipe of recipes) {
		const outputId = recipe.Output?.Id;
		if (!outputId) continue;

		let tokens = map.get(outputId);
		if (!tokens) {
			tokens = new Set();
			map.set(outputId, tokens);
		}

		for (const input of recipe.Inputs ?? []) {
			const name = input.Name?.trim();
			if (name) tokens.add(name);
		}

		const outputName = recipe.Output?.Name?.trim();
		if (outputName) tokens.add(outputName);

		const operation = recipe.Operation?.trim();
		if (operation) tokens.add(operation);
	}

	return map;
}

const recipeSearchTokensByOutputId = buildRecipeSearchTokensByOutputId([
	...(dataSources.Refinery as RecipeForSearch[]),
	...(dataSources.NutrientProcessor as RecipeForSearch[]),
]);

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
		const entry: SearchIndexEntry = {
			id: item.Id,
			name: item.Name,
			type: getTypeFromUrl(url),
			url,
			icon: item.Icon,
		};

		const recipeTokens = recipeSearchTokensByOutputId.get(item.Id);
		if (recipeTokens && recipeTokens.size > 0) {
			const parts = [
				...(entry.searchText ? [entry.searchText] : []),
				...recipeTokens,
			];
			entry.searchText = parts.join('\n');
		}

		return entry;
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