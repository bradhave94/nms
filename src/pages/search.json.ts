import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getRouteEligibleCatalog } from '@utils/routeCatalog.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';
import { getNewUpdatePayload } from '@utils/newUpdate';

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
	subtitle?: string;
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

const getTypeFromUrl = (url: string): string => {
	const cleanUrl = url.replace(/^\/+/, '');
	const [prefix] = cleanUrl.split('/');
	return prefix || 'item';
};

const catalogEntries = getRouteEligibleCatalog();
const namedEntries = catalogEntries.map((entry) => ({
	...entry,
	item: entry.item as unknown as Item,
}));
const nameCounts = new Map<string, number>();
const releaseVariants = new Map(getNewUpdatePayload().Items
	.filter((item) => item.ReleaseVariant)
	.map((item) => [item.Id, item.ReleaseVariant!]));
for (const { item } of namedEntries) {
	const name = item.Name.toLowerCase();
	nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
}

// Route eligibility removes recipe/creature metadata without pages or icons;
// aliases are retained only as hidden search tokens on their canonical item.
const itemSearchEntries: SearchIndexEntry[] = namedEntries.map(({ item, url, aliases }) => {
	const aliasSearchTokens = aliases.flatMap((alias) =>
		[alias.Id, alias.Name, alias.Group]
			.map((value) => (typeof value === 'string' ? value.trim() : ''))
			.filter(Boolean)
	);
	const entry: SearchIndexEntry = {
		id: item.Id,
		name: item.Name,
		type: getTypeFromUrl(url),
		url,
		icon: item.Icon,
		subtitle: releaseVariants.has(item.Id)
			? `Expedition ${releaseVariants.get(item.Id)!.Expedition} variant`
			: (nameCounts.get(item.Name.toLowerCase()) ?? 0) > 1 ? item.Group : undefined,
		searchText: aliasSearchTokens.length > 0 ? aliasSearchTokens.join('\n') : undefined,
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
