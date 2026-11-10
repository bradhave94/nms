// Nutrient Ingestor bonuses: the one Exosuit stat each food or fish boosts, and how long one unit lasts.
//
// The stat is the product table's FoodBonusStat (GcStatsTypes) with the game's English label.
// One unit lasts BaseFoodDuration (GcGameplayGlobals, 600 s in 7.10) x the item's CookingValue,
// which matches the in-game timers (Curdy Cracker 0.66 = 6:36, Glacier Carp 0.15 = 1:30).
// The strength isn't here: FoodBonusStatAmount is 0 for every product, so the game stores no fixed
// number per food.
//
// The extractor writes FoodBonusStatName and FoodBonusDurationSeconds from its next refresh
// (bradhave94/nms-data-extractor#4). Until then src/data/ingestorBonuses.json is that parser's
// output for the 7.10 tables; datav2 values win when present.
import snapshot from '../data/ingestorBonuses.json';
import { getById, getSlug, type Item } from '@utils/lookup.js';

export interface IngestorBonus {
	stat: string;
	statName: string;
	durationSeconds: number;
}

type FoodBonusFields = {
	FoodBonusStat?: string | null;
	FoodBonusStatName?: string | null;
	FoodBonusDurationSeconds?: number | null;
};

const SNAPSHOT = snapshot as Record<string, IngestorBonus>;

export const INGESTOR_PATH = '/nutrient-ingestor/';
export const INGESTOR_TECH_ID = 'FOOD_UNIT';
/** BaseFoodDuration in GcGameplayGlobals (7.10), seconds. */
export const BASE_FOOD_DURATION_SECONDS = 600;

export function getIngestorBonus(item: Pick<Item, 'Id'> & FoodBonusFields): IngestorBonus | undefined {
	const { FoodBonusStat: stat, FoodBonusStatName: statName, FoodBonusDurationSeconds: duration } = item;
	if (stat && statName && typeof duration === 'number' && duration > 0) {
		return { stat, statName, durationSeconds: duration };
	}
	return SNAPSHOT[item.Id];
}

/** "6 min 36 s", "10 min", "45 s". */
export function formatIngestorDuration(seconds: number): string {
	const total = Math.round(seconds);
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	if (minutes === 0) return `${rest} s`;
	return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/** ISO 8601 duration for <time datetime>. */
export function isoDuration(seconds: number): string {
	const total = Math.round(seconds);
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	return `PT${minutes ? `${minutes}M` : ''}${rest || !minutes ? `${rest}S` : ''}`;
}

export const statAnchor = (stat: string): string => stat.toLowerCase().replace(/_/g, '-');

export interface IngestorRow {
	id: string;
	name: string;
	icon: string;
	href: string;
	kind: 'Food' | 'Fish';
	durationSeconds: number;
}

export interface IngestorGroup {
	stat: string;
	statName: string;
	anchor: string;
	rows: IngestorRow[];
}

/** Every item with a bonus, grouped by stat (largest group first), longest-lasting first in each. */
export function ingestorGroups(): IngestorGroup[] {
	const groups = new Map<string, IngestorGroup>();
	for (const id of Object.keys(SNAPSHOT)) {
		const item = getById(id);
		if (!item) continue;
		const bonus = getIngestorBonus(item as Item & FoodBonusFields);
		if (!bonus) continue;
		const href = getSlug(item);
		let group = groups.get(bonus.stat);
		if (!group) {
			group = { stat: bonus.stat, statName: bonus.statName, anchor: statAnchor(bonus.stat), rows: [] };
			groups.set(bonus.stat, group);
		}
		group.rows.push({
			id,
			name: item.Name,
			icon: item.Icon,
			href,
			kind: href.startsWith('/fish/') ? 'Fish' : 'Food',
			durationSeconds: bonus.durationSeconds,
		});
	}
	const list = [...groups.values()];
	for (const group of list) {
		group.rows.sort((a, b) => b.durationSeconds - a.durationSeconds || a.name.localeCompare(b.name));
	}
	return list.sort((a, b) => b.rows.length - a.rows.length || a.statName.localeCompare(b.statName));
}
