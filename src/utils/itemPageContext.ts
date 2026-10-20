import { findOutput, getById, getSlug, findInputFromRefiner, findInputFromCooking, findInputFromCrafting } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import { toWebp } from '@utils/icons';
import { formatRefineryTime, getRefineSecondsPerBatch } from '@utils/itemFormatters';
import { createArray } from '@utils/recipeTree';
import type { RecipeOutput } from '@utils/recipeTree';
import type { ItemPageSchemaInput } from '@utils/itemPageSchema';
import { ensureTrailingSlashUrl } from '@utils/trailingSlash.js';

export type ItemPageSchemaContext = Omit<ItemPageSchemaInput, 'dateModified' | 'pageTitle' | 'pageDescription'>;

const categoryNameMap: Record<string, string> = {
	raw: 'Raw Materials',
	products: 'Products',
	food: 'Food',
	curiosities: 'Curiosities',
	fish: 'Fish',
	technology: 'Technology',
	other: 'Other',
	refinery: 'Refinery',
	buildings: 'Buildings',
	upgrades: 'Upgrades',
	exocraft: 'Exocraft',
	starships: 'Starships',
	corvette: 'Corvette',
};

const categoryFirstPagePathMap: Record<string, string> = {
	raw: '/raw',
	products: '/products',
	food: '/food',
	curiosities: '/curiosities',
	fish: '/fish',
	technology: '/technology',
	other: '/other',
	buildings: '/buildings',
	upgrades: '/upgrades',
	exocraft: '/exocraft',
	starships: '/starships',
	corvette: '/corvette',
};

const categorySingularMap: Record<string, string> = {
	raw: 'raw material',
	products: 'product',
	food: 'food item',
	curiosities: 'curiosity',
	fish: 'fish',
	technology: 'technology item',
	other: 'item',
	buildings: 'building part',
	upgrades: 'upgrade',
	exocraft: 'exocraft item',
	starships: 'starship item',
	corvette: 'corvette item',
	refinery: 'refined item',
};

export const prepareItemPageSchemaInput = (
	item: Item,
	siteOrigin: string,
	pathname: string,
): ItemPageSchemaContext => {
	const canonicalUrl = ensureTrailingSlashUrl(new URL(pathname, siteOrigin).toString());
	const normalizedSlug = (item.Slug ?? '').replace(/^\/+/, '').replace(/^cooking\//, 'food/');
	const categorySlug = normalizedSlug.split('/')[0] || 'items';
	const categoryName = categoryNameMap[categorySlug] ?? 'Items';
	const categorySingular = categorySingularMap[categorySlug] ?? 'item';
	const categoryPath = categoryFirstPagePathMap[categorySlug] ?? '/items';
	const categoryUrl = ensureTrailingSlashUrl(`${siteOrigin}${categoryPath}`);
	const itemImageUrl = `${siteOrigin}/images/items/${item.Icon}`;
	const isFoodItem = Boolean(item.Slug?.startsWith('food/') || item.Slug?.startsWith('cooking/'));

	const { rawItems } = createArray(item);
	const dataLength = item.RequiredItems?.length ? 1 : 0;
	const outputRecipes = findOutput(item.Id) as unknown as RecipeOutput[];

	let outputRefinedLength = 0;
	let outputCookedLength = 0;
	for (const entry of outputRecipes) {
		if (entry.Slug?.startsWith('nutrient-processor/')) {
			outputCookedLength += 1;
		} else {
			outputRefinedLength += 1;
		}
	}

	return {
		item,
		categoryName,
		categorySingular,
		categoryUrl,
		siteOrigin,
		canonicalUrl,
		itemImageUrl,
		isFoodItem,
		outputRecipes,
		rawItems,
		dataLength,
		outputRefinedLength,
		outputCookedLength,
		bestMachineSignature: bestMachineSignature(item),
	};
};

/** "id:qty,id:qty>outQty" of the Best yield machine recipe (the one the page's box shows). */
const bestMachineSignature = (item: Item): string | undefined => {
	const view = buildItemRecipeView(item);
	const best = view.bestRefine ?? view.bestCook;
	return best ? `${best.inputs.map((slot) => `${slot.id}:${slot.qty}`).sort().join(',')}>${best.output.qty}` : undefined;
};

// ── Item page view model (Page.astro) ─────────────────────────────────────────────
// Every refiner, cooking and crafting recipe as an open "A + B → C" row, built straight from the
// data so each row keeps its own machine and time.

export type RecipeSlot = {
	id: string;
	name: string;
	icon: string;
	colour?: string;
	href: string;
	qty: number;
};

export type RecipeRowView = {
	inputs: RecipeSlot[];
	output: RecipeSlot;
	/** 'refine' rows run in a Refiner sized by input count; 'cook' rows in the Nutrient Processor. */
	kind: 'refine' | 'cook' | 'craft';
	machine: string;
	machineShort: string;
	operation?: string;
	seconds?: number;
	time?: string;
	inputUnits: number;
	/** Output gained per batch: the output minus any of the same item the recipe consumes ("Indium + Chromatic Metal -> 2 Indium" gains 1). */
	netOut: number;
	/** Net output per input unit: divided by the other inputs, or by the self input when that is larger. */
	yieldPerInput: number;
};

/** Net gain and yield for a recipe that may consume its own output. */
const netYield = (inputs: RecipeSlot[], output: RecipeSlot) => {
	const self = inputs.filter((slot) => slot.id === output.id).reduce((sum, slot) => sum + slot.qty, 0);
	const netOut = output.qty - self;
	const otherUnits = inputs.reduce((sum, slot) => sum + slot.qty, 0) - self;
	return { netOut, yieldPerInput: netOut > 0 ? netOut / Math.max(otherUnits, self || 1) : 0 };
};

type IO = { Id: string; Quantity: number };
type MachineRecipe = { Id?: string; Slug?: string; Operation?: string; Time?: string; Output?: IO; Inputs?: IO[] };

/** Refiner size is set by how many input slots the recipe uses. */
export const refinerForInputs = (count: number): { machine: string; short: string } =>
	count >= 3
		? { machine: 'Large Refiner', short: 'Large' }
		: count === 2
			? { machine: 'Medium Refiner', short: 'Medium' }
			: { machine: 'Portable Refiner', short: 'Portable' };

export const toSlot = (id: string, qty: number): RecipeSlot | undefined => {
	const found = getById(id);
	if (!found) return undefined;
	return {
		id,
		name: found.Name,
		icon: toWebp(found.Icon),
		colour: found.Colour || undefined,
		href: getSlug(found),
		qty,
	};
};

const isCookingRecipe = (recipe: MachineRecipe) => Boolean(recipe.Slug?.startsWith('nutrient-processor/'));

export const toRecipeRow = (recipe: MachineRecipe): RecipeRowView | undefined => {
	if (!recipe.Output || !recipe.Inputs?.length) return undefined;
	const output = toSlot(recipe.Output.Id, recipe.Output.Quantity ?? 1);
	if (!output) return undefined;
	const inputs = recipe.Inputs.map((input) => toSlot(input.Id, input.Quantity)).filter(
		(slot): slot is RecipeSlot => Boolean(slot)
	);
	if (inputs.length === 0) return undefined;
	const inputUnits = inputs.reduce((sum, slot) => sum + slot.qty, 0);
	const cooking = isCookingRecipe(recipe);
	const refiner = refinerForInputs(inputs.length);
	return {
		inputs,
		output,
		kind: cooking ? 'cook' : 'refine',
		machine: cooking ? 'Nutrient Processor' : refiner.machine,
		machineShort: cooking ? 'Nutrient Processor' : refiner.short,
		operation: recipe.Operation || undefined,
		// The Nutrient Processor's Time has no known unit, so only refiner rows show a time.
		seconds: cooking ? undefined : getRefineSecondsPerBatch(recipe.Time, recipe.Output.Id),
		time: cooking ? undefined : formatRefineryTime(recipe.Time, recipe.Output.Id),
		inputUnits,
		...netYield(inputs, output),
	};
};

/** Best net yield per input unit first; ties go to the bigger net batch, then the faster one. */
export const byYield = (a: RecipeRowView, b: RecipeRowView): number =>
	b.yieldPerInput - a.yieldPerInput ||
	b.netOut - a.netOut ||
	(a.seconds ?? Number.POSITIVE_INFINITY) - (b.seconds ?? Number.POSITIVE_INFINITY) ||
	a.inputs.length - b.inputs.length;

const rowKey = (row: RecipeRowView) =>
	`${row.kind}|${row.inputs.map((s) => `${s.id}:${s.qty}`).join(',')}|${row.output.id}:${row.output.qty}`;

const uniqueRows = (rows: RecipeRowView[]) => {
	const seen = new Set<string>();
	return rows.filter((row) => {
		const key = rowKey(row);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const isRow = (row: RecipeRowView | undefined): row is RecipeRowView => Boolean(row);

export type CraftUseTile = RecipeSlot & { category: string; categoryLabel: string };

export type ItemRecipeView = {
	makeRefine: RecipeRowView[];
	makeCook: RecipeRowView[];
	craft?: RecipeRowView;
	bestRefine?: RecipeRowView;
	quickestRefine?: RecipeRowView;
	bestCook?: RecipeRowView;
	refineInto: RecipeRowView[];
	cookInto: RecipeRowView[];
	craftWith: CraftUseTile[];
	craftWithCategories: Array<{ slug: string; label: string; count: number }>;
	waysToMake: number;
};

export const buildItemRecipeView = (item: Item): ItemRecipeView => {
	const outputs = (findOutput(item.Id) as unknown as MachineRecipe[]).map(toRecipeRow).filter(isRow);
	const makeRefine = uniqueRows(outputs.filter((row) => row.kind === 'refine')).sort(byYield);
	const makeCook = uniqueRows(outputs.filter((row) => row.kind === 'cook')).sort(byYield);

	let craft: RecipeRowView | undefined;
	if (item.RequiredItems?.length) {
		const inputs = item.RequiredItems.map((r) => toSlot(r.Id, r.Quantity)).filter(
			(slot): slot is RecipeSlot => Boolean(slot)
		);
		const output = toSlot(item.Id, 1);
		const isFood = Boolean(item.Slug?.startsWith('food/') || item.Slug?.startsWith('cooking/'));
		if (inputs.length > 0 && output) {
			const inputUnits = inputs.reduce((sum, slot) => sum + slot.qty, 0);
			craft = {
				inputs,
				output,
				kind: 'craft',
				machine: isFood ? 'Nutrient Processor' : 'Crafting menu',
				machineShort: isFood ? 'Nutrient Processor' : 'Crafting',
				inputUnits,
				netOut: 1,
				yieldPerInput: inputUnits > 0 ? 1 / inputUnits : 0,
			};
		}
	}

	const bestRefine = makeRefine[0];
	// "Quickest" = least time per item gained (not the shortest batch), and only shown when it beats the best yield.
	const perItem = (row: RecipeRowView) =>
		typeof row.seconds === 'number' && row.netOut > 0 ? row.seconds / row.netOut : Number.POSITIVE_INFINITY;
	const quickest = makeRefine.reduce<RecipeRowView | undefined>(
		(best, row) => (perItem(row) < (best ? perItem(best) : Number.POSITIVE_INFINITY) ? row : best),
		undefined
	);
	const quickestRefine =
		quickest && bestRefine && quickest !== bestRefine && perItem(quickest) < perItem(bestRefine) ? quickest : undefined;

	const refineInto = uniqueRows(
		(findInputFromRefiner(item.Id) as unknown as MachineRecipe[])
			.map((recipe) => toRecipeRow({ ...recipe, Slug: 'refinery/' }))
			.filter(isRow)
	).sort((a, b) => a.output.name.localeCompare(b.output.name) || byYield(a, b));
	const cookInto = uniqueRows(
		(findInputFromCooking(item.Id) as unknown as MachineRecipe[])
			.map((recipe) => toRecipeRow({ ...recipe, Slug: 'nutrient-processor/' }))
			.filter(isRow)
	).sort((a, b) => a.output.name.localeCompare(b.output.name) || byYield(a, b));

	const tilesById = new Map<string, CraftUseTile>();
	for (const recipe of findInputFromCrafting(item.Id) as unknown as MachineRecipe[]) {
		const outputId = recipe.Output?.Id;
		if (!outputId || tilesById.has(outputId)) continue;
		const qty = recipe.Inputs?.find((input) => input.Id === item.Id)?.Quantity ?? 1;
		const slot = toSlot(outputId, qty);
		if (!slot) continue;
		const category = slot.href.replace(/^\/+/, '').split('/')[0] || 'items';
		tilesById.set(outputId, { ...slot, category, categoryLabel: categoryNameMap[category] ?? 'Other' });
	}
	const craftWith = [...tilesById.values()].sort((a, b) => a.name.localeCompare(b.name));
	const counts = new Map<string, { slug: string; label: string; count: number }>();
	for (const tile of craftWith) {
		const entry = counts.get(tile.category) ?? { slug: tile.category, label: tile.categoryLabel, count: 0 };
		entry.count += 1;
		counts.set(tile.category, entry);
	}
	const craftWithCategories = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

	return {
		makeRefine,
		makeCook,
		craft,
		bestRefine,
		quickestRefine,
		bestCook: makeCook[0],
		refineInto,
		cookInto,
		craftWith,
		craftWithCategories,
		waysToMake: makeRefine.length + makeCook.length + (craft ? 1 : 0),
	};
};

/** Breadcrumb/category label and list path for an item, from its slug. */
export const getItemCategory = (item: Pick<Item, 'Slug'>): { slug: string; name: string; path: string } => {
	const normalizedSlug = (item.Slug ?? '').replace(/^\/+/, '').replace(/^cooking\//, 'food/');
	const slug = normalizedSlug.split('/')[0] || 'items';
	return { slug, name: categoryNameMap[slug] ?? 'Items', path: categoryFirstPagePathMap[slug] ?? '/items' };
};

// ── Guide match ──────────────────────────────────────────────────────────────────
export type GuideCandidate = { id: string };

const toSlugWords = (value: string) =>
	value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

/** The subjects a post is about, read from its slug: "how-to-make-chromatic-metal-no-mans-sky" gives ["chromatic-metal"]. */
const guideSubjects = (slug: string): string[] => {
	const core = slug
		.replace(/^(nms-|no-mans-sky-)/, '')
		.replace(/-(no-mans-sky|nms)(-\d{4})?$/, '')
		.replace(/^how-to-(make|craft|get|build|find|farm)-(an?-)?/, '')
		.replace(/-guide$/, '');
	return core.split('-vs-').filter(Boolean);
};

/**
 * The blog post written about this item, if there is one. A post matches when its slug's subject is
 * exactly the item's name ("how-to-craft-fusion-ignitor-no-mans-sky" for Fusion Ignitor), so
 * "Antimatter Housing" never matches Antimatter. Single-subject posts win over "X vs Y" posts.
 */
export const findItemGuide = <T extends GuideCandidate>(itemName: string, posts: T[]): T | undefined => {
	const name = toSlugWords(itemName);
	if (!name) return undefined;
	let comparison: T | undefined;
	for (const post of posts) {
		const subjects = guideSubjects(post.id);
		if (!subjects.includes(name)) continue;
		if (subjects.length === 1) return post;
		comparison ??= post;
	}
	return comparison;
};

/** A fact shown as a pill in the item header (`tier` colours rarity pills). */
export type HeaderPill = { label: string; href?: string; tier?: string; icon?: string };
/** A row of the item's "Details" list in the right column. */
export type ItemFact = { label: string; value: string; href?: string };
