import type { APIRoute } from 'astro';
import * as dataSources from '@datav2/index.js';
import { createArray } from '@utils/recipeTree.js';
import type { ProcessedItem } from '@utils/recipeTree.js';
import { getSlug } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';

type PlannerItem = {
	id: string;
	name: string;
	icon: string;
	quantity: number;
};

type PlannerTreeItem = {
	id: string;
	name: string;
	icon: string;
	quantity: number;
	url: string;
	children: PlannerTreeItem[];
};

type PlannerProduct = {
	id: string;
	name: string;
	icon: string;
	url: string;
	recipeTree: PlannerTreeItem[];
	rawItems: PlannerItem[];
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

const mapPlannerItem = (entry: { Id: string; Name: string; Icon: string; Quantity: number }): PlannerItem => ({
	id: entry.Id,
	name: entry.Name,
	icon: entry.Icon,
	quantity: entry.Quantity,
});

const mapTreeItem = (entry: ProcessedItem): PlannerTreeItem => ({
	id: entry.Id,
	name: entry.Name,
	icon: entry.Icon,
	quantity: entry.Quantity,
	url: getSlug(entry.Id),
	children: entry.RequiredItems.map(mapTreeItem),
});

const body: PlannerProduct[] = craftableItems
	.map((item) => {
		const { array, rawItems } = createArray(item, 1);
		return {
			item,
			recipeTree: array,
			rawItems,
		};
	})
	.filter(({ rawItems }) => rawItems.length > 0)
	.map(({ item, recipeTree, rawItems }) => ({
		id: item.Id,
		name: item.Name,
		icon: item.Icon,
		url: getSlug(item),
		recipeTree: recipeTree.map(mapTreeItem),
		rawItems: rawItems.map(mapPlannerItem),
	}))
	.sort((a, b) => a.name.localeCompare(b.name));

export const prerender = true;

export const GET: APIRoute = () => {
	return new Response(JSON.stringify({ body }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
		},
	});
};
