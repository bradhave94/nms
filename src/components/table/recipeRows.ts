// Rows for the recipe tables and their /cards variants (refining, cooking, crafting guide).
// One shape for all three machines so the table, the cards and the filters share one code path.
import refinery from '@datav2/Refinery.json';
import processor from '@datav2/NutrientProcessor.json';
import products from '@datav2/Products.json';
import { getById, getSlug } from '@utils/lookup.js';
import type { Item, RequiredItem } from '@utils/lookup.js';
import { formatRefineryTime } from '@utils/itemFormatters';
import { toWebp } from '@utils/icons';

export interface RecipeItem {
	id: string;
	name: string;
	/** Quantity in the recipe; crafting outputs have none. */
	amount?: number;
	colour: string;
	/** WebP icon file name under /images/items/. */
	icon?: string;
	href: string;
}

export interface RecipeRow {
	inputs: RecipeItem[];
	output: RecipeItem;
	/** Refiner / Nutrient Processor operation name. */
	operation?: string;
	/** Line under the operation, e.g. "Large refiner · ~20m". */
	detail?: string;
	/** Output unit value (crafting guide). */
	value?: number;
	/** Output units per input unit. */
	yield: number;
}

type Machine = { Inputs: RequiredItem[]; Output: RequiredItem; Operation?: string; Time?: string };

const toItem = (item: Item, amount?: number): RecipeItem => ({
	id: item.Id,
	name: item.Name,
	...(amount ? { amount } : {}),
	colour: item.Colour,
	icon: item.Icon ? toWebp(item.Icon) : undefined,
	href: getSlug(item.Id),
});

const resolveInputs = (inputs: RequiredItem[]): RecipeItem[] =>
	inputs
		.map((input) => {
			const item = getById(input.Id);
			return item ? toItem(item, input.Quantity) : undefined;
		})
		.filter((item): item is RecipeItem => item !== undefined);

const yieldOf = (inputs: RecipeItem[], output: RecipeItem): number => {
	const used = inputs.reduce((sum, input) => sum + (input.amount ?? 1), 0);
	return used > 0 ? (output.amount ?? 1) / used : 0;
};

/** Refiner names by input slots: a recipe with n inputs needs at least that refiner. */
export const REFINER_SIZES = ['Portable', 'Medium', 'Large'] as const;

const machineRow = (recipe: Machine, detail?: (recipe: Machine, inputs: RecipeItem[]) => string | undefined): RecipeRow | undefined => {
	const inputs = resolveInputs(recipe.Inputs);
	const outputItem = getById(recipe.Output.Id);
	if (!outputItem || !inputs[0]) return undefined;
	const output = toItem(outputItem, recipe.Output.Quantity);
	return {
		inputs,
		output,
		operation: recipe.Operation,
		detail: detail?.(recipe, inputs),
		value: outputItem.BaseValueUnits,
		yield: yieldOf(inputs, output),
	};
};

const byOutputName = (a: RecipeRow, b: RecipeRow): number => a.output.name.localeCompare(b.output.name);

/** Refiner recipes in data order (the default table order is by output name, applied on the client). */
export const refiningRows = (): RecipeRow[] =>
	(refinery as unknown as Machine[])
		.map((recipe) =>
			machineRow(recipe, (r, inputs) => {
				const size = REFINER_SIZES[Math.min(inputs.length, 3) - 1];
				const time = formatRefineryTime(r.Time, r.Output.Id);
				return [size, time && `~${time}`].filter(Boolean).join(' · ');
			}),
		)
		.filter((row): row is RecipeRow => row !== undefined);

/** Nutrient Processor recipes. Every recipe has the same 5.0 game time, so only the operation shows. */
export const cookingRows = (): RecipeRow[] =>
	(processor as unknown as Machine[]).map((recipe) => machineRow(recipe)).filter((row): row is RecipeRow => row !== undefined);

/** Crafted products (items with RequiredItems). */
export const craftingRows = (): RecipeRow[] =>
	(products as unknown as Item[])
		.map((item): RecipeRow | undefined => {
			if (!item.RequiredItems?.length) return undefined;
			const inputs = resolveInputs(item.RequiredItems);
			if (!inputs[0]) return undefined;
			const output = toItem(item);
			return { inputs, output, value: item.BaseValueUnits, yield: yieldOf(inputs, output) };
		})
		.filter((row): row is RecipeRow => row !== undefined);

/** Default display order: by output name (refining, cooking) or by unit value (crafting). */
export const sortRows = (rows: RecipeRow[], by: 'name' | 'value'): RecipeRow[] =>
	[...rows].sort(by === 'value' ? (a, b) => (b.value ?? 0) - (a.value ?? 0) || byOutputName(a, b) : byOutputName);
