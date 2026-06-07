import products from '../datav2/Products.json';
import localization from '../datav2/localization.json';
import { getById } from './lookup';
import type { Item } from './lookup';

const GROW_TIME_RE = /Approximate growing time:\s*(.+)/;

/** Seeds whose harvest item is not listed in RequiredItems as PLANT_* / NIPNIPBUDS. */
const SEED_HARVEST_OVERRIDES: Record<string, string> = {
	CREATUREPLANT: 'CREATURE1',
	GRAVPLANT: 'GRAVBALL',
	SACVENOMPLANT: 'SACVENOM',
	PEARLPLANT: 'ALBUMENPEARL',
};

const localizationStrings = localization as Record<string, string>;

function parseGrowTime(description: string): string | undefined {
	const match = description.match(GROW_TIME_RE);
	return match?.[1]?.trim();
}

function resolveHarvestId(seed: Item): string | undefined {
	const override = SEED_HARVEST_OVERRIDES[seed.Id];
	if (override) {
		return override;
	}

	const harvestItem = seed.RequiredItems?.find(
		(item) => item.Id.startsWith('PLANT_') || item.Id === 'NIPNIPBUDS',
	);
	return harvestItem?.Id;
}

function buildPlantGrowTimeLookup(): Record<string, string> {
	const lookup: Record<string, string> = {};

	for (const product of products as Item[]) {
		let growTime = parseGrowTime(product.Description ?? '');

		if (!growTime && product.Id === 'NIPPLANT') {
			growTime = parseGrowTime(localizationStrings.UI_PLANTPROD_NIP_DESC ?? '');
		}

		if (!growTime) {
			continue;
		}

		const harvestId = resolveHarvestId(product);
		if (harvestId) {
			lookup[harvestId] = growTime;
		}
	}

	return lookup;
}

const plantGrowTimeByHarvestId = buildPlantGrowTimeLookup();

export type GrowablePlant = {
	harvestId: string;
	seedId: string;
	name: string;
	icon: string;
	growTime: string;
	growTimeMinutes: number;
	harvestQuantity: number;
};

export function parseGrowTimeMinutes(growTime: string): number {
	const normalized = growTime.toLowerCase().trim();
	let total = 0;
	const hourMatch = normalized.match(/(\d+)\s*(?:hour|hours|hr|hrs)\b/);
	if (hourMatch) {
		total += Number.parseInt(hourMatch[1], 10) * 60;
	}
	const minMatch = normalized.match(/(\d+)\s*(?:min|mins|minute|minutes)\b/);
	if (minMatch) {
		total += Number.parseInt(minMatch[1], 10);
	}
	return total;
}

function resolveHarvestQuantity(seed: Item, harvestId: string): number {
	const harvestEntry = seed.RequiredItems?.find((item) => item.Id === harvestId);
	return harvestEntry?.Quantity ?? 1;
}

export function getAllGrowablePlants(): GrowablePlant[] {
	const plants: GrowablePlant[] = [];

	for (const product of products as Item[]) {
		let growTime = parseGrowTime(product.Description ?? '');

		if (!growTime && product.Id === 'NIPPLANT') {
			growTime = parseGrowTime(localizationStrings.UI_PLANTPROD_NIP_DESC ?? '');
		}

		if (!growTime) {
			continue;
		}

		const harvestId = resolveHarvestId(product);
		if (!harvestId) {
			continue;
		}

		const harvestItem = getById(harvestId);
		plants.push({
			harvestId,
			seedId: product.Id,
			name: harvestItem?.Name ?? harvestId,
			icon: harvestItem?.Icon ?? product.Icon,
			growTime,
			growTimeMinutes: parseGrowTimeMinutes(growTime),
			harvestQuantity: resolveHarvestQuantity(product, harvestId),
		});
	}

	return plants.sort((a, b) => a.name.localeCompare(b.name));
}

export function getPlantGrowTime(itemId: string): string | undefined {
	return plantGrowTimeByHarvestId[itemId];
}

export function getGrowTimeHeader(): string {
	return localizationStrings.GROWTIME_HEADER ?? 'Growing Time';
}
