import type { APIRoute } from 'astro';
import * as dataSources from '@datav2/index.js';
import { createArray } from '@utils/recipeTree.js';
import { getSlug } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';

type PlannerRawItem = {
	id: string;
	name: string;
	icon: string;
	quantity: number;
};

type PlannerProduct = {
	id: string;
	name: string;
	icon: string;
	url: string;
	rawItems: PlannerRawItem[];
};

const allData = Object.values(dataSources).flatMap((source) =>
	Array.isArray(source) ? (source as Item[]) : [],
);

const seenIds = new Set<string>();
const craftableItems = allData.filter((item) => {
	if (!item.RequiredItems || item.RequiredItems.length === 0) return false;
	if (seenIds.has(item.Id)) return false;
	seenIds.add(item.Id);
	return true;
});

const body: PlannerProduct[] = craftableItems
	.map((item) => {
		const { rawItems } = createArray(item, 1);
		return {
			item,
			rawItems,
		};
	})
	.filter(({ rawItems }) => rawItems.length > 0)
	.map(({ item, rawItems }) => ({
		id: item.Id,
		name: item.Name,
		icon: item.Icon,
		url: getSlug(item),
		rawItems: rawItems.map((rawItem) => ({
			id: rawItem.Id,
			name: rawItem.Name,
			icon: rawItem.Icon,
			quantity: rawItem.Quantity,
		})),
	}))
	.sort((a, b) => a.name.localeCompare(b.name));

export const GET: APIRoute = () => {
	return new Response(JSON.stringify({ body }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
		},
	});
};
