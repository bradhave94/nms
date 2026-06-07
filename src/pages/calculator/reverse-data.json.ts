import type { APIRoute } from 'astro';
import {
	findInputFromRefiner,
	findInputFromCooking,
	findInputFromCrafting,
	getById,
	getSlug,
} from '@utils/lookup.js';
import {
	Refinery,
	NutrientProcessor,
	Products,
	Food,
	Curiosities,
	Fish,
	ConstructedTechnology,
	Technology,
	TechnologyModule,
	Others,
	Buildings,
	Trade,
	Upgrades,
	Exocraft,
	Starships,
	Corvette,
} from '@datav2/index.js';

type RecipeWithInputs = {
	Id: string;
	Inputs: Array<{ Id: string; Quantity: number }>;
	Output?: { Id: string; Quantity: number };
};

type ReverseRecipeInput = {
	id: string;
	name: string;
	icon: string;
	quantity: number;
};

type ReverseRecipe = {
	method: 'refine' | 'cook' | 'craft';
	outputId: string;
	outputName: string;
	outputIcon: string;
	outputUrl: string;
	outputQuantity: number;
	inputs: ReverseRecipeInput[];
};

type ReverseEntry = {
	id: string;
	name: string;
	icon: string;
	recipes: ReverseRecipe[];
};

function collectInputIds(): Set<string> {
	const ids = new Set<string>();

	for (const recipe of Refinery as Array<{ Inputs?: Array<{ Id: string }> }>) {
		for (const input of recipe.Inputs ?? []) {
			ids.add(input.Id);
		}
	}

	for (const recipe of NutrientProcessor as Array<{ Inputs?: Array<{ Id: string }> }>) {
		for (const input of recipe.Inputs ?? []) {
			ids.add(input.Id);
		}
	}

	const craftingSources = [
		Products,
		Food,
		Curiosities,
		Fish,
		ConstructedTechnology,
		Technology,
		TechnologyModule,
		Others,
		Buildings,
		Trade,
		Upgrades,
		Exocraft,
		Starships,
		Corvette,
	] as Array<Array<{ RequiredItems?: Array<{ Id: string }> }>>;

	for (const source of craftingSources) {
		for (const item of source) {
			for (const required of item.RequiredItems ?? []) {
				ids.add(required.Id);
			}
		}
	}

	return ids;
}

function mapRecipe(
	recipe: RecipeWithInputs,
	method: 'refine' | 'cook' | 'craft'
): ReverseRecipe | null {
	const outputId = recipe.Output?.Id;
	if (!outputId) return null;

	const outputItem = getById(outputId);
	if (!outputItem?.Name) return null;

	return {
		method,
		outputId,
		outputName: outputItem.Name,
		outputIcon: outputItem.Icon ?? '',
		outputUrl: getSlug(outputItem),
		outputQuantity: recipe.Output?.Quantity ?? 1,
		inputs: recipe.Inputs.map((input) => {
			const inputItem = getById(input.Id);
			return {
				id: input.Id,
				name: inputItem?.Name ?? input.Id,
				icon: inputItem?.Icon ?? '',
				quantity: input.Quantity,
			};
		}),
	};
}

function buildEntry(inputId: string): ReverseEntry {
	const item = getById(inputId);
	const recipes: ReverseRecipe[] = [];

	for (const recipe of findInputFromRefiner(inputId) as unknown as RecipeWithInputs[]) {
		const mapped = mapRecipe(recipe, 'refine');
		if (mapped) recipes.push(mapped);
	}

	for (const recipe of findInputFromCooking(inputId) as unknown as RecipeWithInputs[]) {
		const mapped = mapRecipe(recipe, 'cook');
		if (mapped) recipes.push(mapped);
	}

	for (const recipe of findInputFromCrafting(inputId) as unknown as RecipeWithInputs[]) {
		const mapped = mapRecipe(recipe, 'craft');
		if (mapped) recipes.push(mapped);
	}

	recipes.sort((a, b) => a.outputName.localeCompare(b.outputName));

	return {
		id: inputId,
		name: item?.Name ?? inputId,
		icon: item?.Icon ?? '',
		recipes,
	};
}

const body: ReverseEntry[] = Array.from(collectInputIds())
	.map((inputId) => buildEntry(inputId))
	.sort((a, b) => a.name.localeCompare(b.name));

export const GET: APIRoute = () => {
	return new Response(JSON.stringify({ body }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
		},
	});
};
