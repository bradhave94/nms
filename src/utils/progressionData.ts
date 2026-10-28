// Expeditions, milestones and ranks, inventory limits and trading for the Reference pages.
// Read directly from the extractor's reference tables (Milestones.json, Inventory.json,
// Trading.json, and the expeditions in ItemSources.json); none of these rows get item pages.
import itemSourcesData from '../datav2/ItemSources.json';
import milestonesData from '../datav2/Milestones.json';
import inventoryData from '../datav2/Inventory.json';
import tradingData from '../datav2/Trading.json';
import tradeGoods from '../datav2/Trade.json';
import { getItemPage, titles, type LinkedItem } from './playerUnlocks';

const titleCase = (text: string): string =>
	text.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());

// ---------- expeditions ----------

type ExpeditionRow = {
	Number: number;
	Remix: number;
	DisplayNumber: number;
	Name: string;
	Description: string | null;
	FinalReward: string | null;
	Title: string | null;
};
type ExpeditionSource = { Type: string; Expeditions?: number[]; Phases?: number[]; SwitchExclusive?: boolean };

export type ExpeditionReward = { item: LinkedItem; switchOnly: boolean };
export type Expedition = {
	number: number;
	name: string;
	description: string | null;
	title: string | null;
	titleAnchor?: string;
	phases: Array<{ phase: number | null; rewards: ExpeditionReward[] }>;
};

export const expeditionAnchor = (number: number): string => `expedition-${number}`;

/** Every expedition with its rewards by phase. Reward tables number expeditions as players see them (DisplayNumber). */
export function expeditions(): Expedition[] {
	const sources = itemSourcesData as unknown as { Expeditions: ExpeditionRow[]; Items: Record<string, ExpeditionSource[]> };
	const byNumber = new Map<number, Map<number | null, ExpeditionReward[]>>();
	for (const [id, list] of Object.entries(sources.Items)) {
		const item = getItemPage(id);
		if (!item) continue;
		for (const source of list) {
			if (source.Type !== 'Expedition') continue;
			for (const number of source.Expeditions ?? []) {
				const phases = (source.Phases ?? []).filter((phase) => phase > 0);
				for (const phase of phases.length ? phases : [null]) {
					const byPhase: Map<number | null, ExpeditionReward[]> = byNumber.get(number) ?? new Map();
					const rewards = byPhase.get(phase) ?? [];
					if (!rewards.some((reward: ExpeditionReward) => reward.item.id === item.id)) rewards.push({ item, switchOnly: Boolean(source.SwitchExclusive) });
					byPhase.set(phase, rewards);
					byNumber.set(number, byPhase);
				}
			}
		}
	}
	return sources.Expeditions.filter((row) => row.Remix === 0)
		.sort((a, b) => a.DisplayNumber - b.DisplayNumber)
		.map((row) => {
			const title = row.Title ? titles.find((entry) => entry.Name === row.Title) : undefined;
			const byPhase: Map<number | null, ExpeditionReward[]> = byNumber.get(row.DisplayNumber) ?? new Map();
			return {
				number: row.DisplayNumber,
				name: row.Name,
				description: row.Description,
				title: row.Title,
				titleAnchor: title ? title.Id.toLowerCase().replace(/_/g, '-') : undefined,
				phases: [...byPhase.entries()]
					.sort(([a], [b]) => (a ?? 99) - (b ?? 99))
					.map(([phase, rewards]) => ({ phase, rewards: rewards.sort((x, y) => x.item.name.localeCompare(y.item.name)) })),
			};
		});
}

// ---------- milestones and ranks ----------

type Ladder = {
	Id: string;
	Title: string | null;
	Notify: string | null;
	ShowInTerminal: boolean;
	UseRank: boolean;
	Levels: Array<{ Name: string | null; Value: number; Trophy: string | null }>;
};
const milestones = milestonesData as { Ladders: Ladder[]; Journey: Array<{ Id: string; Name: string; Points: number }> };

export const journeyRanks = milestones.Journey.map((rank) => ({ name: rank.Name, points: rank.Points }));

// The game's titles name each standing ladder in their hint: "Improve your standing with the Gek".
const standingName = (stat: string): string | null => {
	const hint = titles.find((title) => title.Unlock.Stat === stat && title.Hint?.startsWith('Improve your standing with'))?.Hint;
	return hint ? hint.replace(/^Improve your standing with (the )?/, '') : null;
};

// "Walked 20000u": the game writes on-foot distance in u.
const LADDER_UNITS: Record<string, string> = { DIST_WALKED: 'u' };
// statdefinitionstable shows this stat in sols; the files don't say how stored values convert.
const LADDER_NOTES: Record<string, string> = {
	LONGEST_LIFE_EX: 'Values are as the game stores them; in game this stat is shown in sols.',
};

export type LadderView = { id: string; name: string; unit: string; counts: string | null; note: string | null; levels: Array<{ name: string; value: number }> };
const ladderView = (ladder: Ladder, name: string): LadderView => ({
	id: ladder.Id,
	name,
	unit: LADDER_UNITS[ladder.Id] ?? '',
	// The game's own description of what the ladder counts, with its number left out.
	counts: ladder.Notify ? ladder.Notify.replace('%STAT%', '…') : null,
	note: LADDER_NOTES[ladder.Id] ?? null,
	levels: ladder.Levels.map((level) => ({ name: level.Name ?? '', value: level.Value })),
});

/** The milestone ladders the game shows in its terminal. */
export const milestoneLadders = (): LadderView[] =>
	milestones.Ladders.filter((ladder) => ladder.ShowInTerminal && ladder.Title).map((ladder) => ladderView(ladder, ladder.Title!));

/** Race, guild and Outlaw standing: rank ladders with named ranks, named after the faction. */
export const standingLadders = (): LadderView[] =>
	milestones.Ladders.filter((ladder) => ladder.UseRank && ladder.Levels.every((level) => level.Name))
		.map((ladder) => ({ ladder, name: standingName(ladder.Id) }))
		.filter((entry): entry is { ladder: Ladder; name: string } => Boolean(entry.name))
		.map(({ ladder, name }) => ladderView(ladder, name));

export const ladderAnchor = (id: string): string => id.toLowerCase().replace(/_/g, '-');

// ---------- inventory ----------

type ByClass = { C: number; B: number; A: number; S: number };
type BaseStat = { Stat: string; Min: number; Max: number };
const inventory = inventoryData as unknown as {
	MaxSlots: Record<string, { General: ByClass; Tech: ByClass; Cargo: ByClass }>;
	MultiToolMaxSlots: ByClass;
	ClassOdds: Record<string, ByClass>;
	BaseStats: { Ships: Record<string, Record<string, BaseStat[]>>; Weapons: Record<string, Record<string, BaseStat[]>> };
	Labels: { Ships: Record<string, string | null>; Weapons: Record<string, string | null> };
};

export const CLASSES = ['C', 'B', 'A', 'S'] as const;

// Only types the game names (its base-stats strings) are shown. That leaves out the two freighter
// rows (the data can't say which one is the player's freighter) and the Atlantid colour
// variants, whose stats match the Atlantid row.
const shipLabel = (type: string): string | null => inventory.Labels.Ships[type] ?? null;
const weaponLabel = (type: string): string | null => inventory.Labels.Weapons[type] ?? null;

const anySlots = (values: ByClass): boolean => CLASSES.some((grade) => values[grade] > 0);

/** The most slots each ship type can be upgraded to, by class; types the game gives no upgrades are left out. */
export const shipMaxSlots = () =>
	Object.entries(inventory.MaxSlots)
		.filter(([type, slots]) => anySlots(slots.General) && shipLabel(type))
		.map(([type, slots]) => ({ type, label: shipLabel(type)!, general: slots.General, tech: slots.Tech, cargo: anySlots(slots.Cargo) ? slots.Cargo : null }));

export const multiToolMaxSlots = inventory.MultiToolMaxSlots;

const WEALTH_LABELS: Record<string, string> = { Poor: 'Poor system', Average: 'Average system', Wealthy: 'Wealthy system' };
/** Class odds by system wealth. Only rows that are a full distribution (summing to 100%) are shown;
 * the Pirate row's four 5s aren't one. */
export const classOdds = () =>
	Object.entries(inventory.ClassOdds)
		.filter(([, odds]) => Math.abs(CLASSES.reduce((sum, grade) => sum + odds[grade], 0) - 100) < 0.01)
		.map(([wealth, odds]) => ({ wealth: WEALTH_LABELS[wealth] ?? wealth, odds }));

// Stat names: the game's own where it has one (STATS_SHIP_SHIELD, STATS_SHIP_HYPERDRIVE,
// STATS_WEAPON_MINING, STAT_FREI_FLEET); ALIEN_SHIP and ROBOT_SHIP have none and aren't shown.
const STAT_LABELS: Record<string, string> = {
	SHIP_DAMAGE: 'Damage',
	SHIP_SHIELD: 'Shield Strength',
	SHIP_HYPERDRIVE: 'Hyperdrive Range',
	SHIP_AGILE: 'Maneuverability',
	WEAPON_DAMAGE: 'Damage',
	WEAPON_MINING: 'Mining Yield',
	WEAPON_SCAN: 'Scanning',
	FREI_HYPERDRIVE: 'Hyperdrive Range',
	FREI_FLEET: 'Fleet Coordination',
};

export type StatTable = { type: string; label: string; rows: Array<{ stat: string; byClass: Record<string, string> }> };
const range = (min: number, max: number): string => (min === max ? `${min}` : `${min}–${max}`);
function statTables(source: Record<string, Record<string, BaseStat[]>>, label: (type: string) => string | null): StatTable[] {
	return Object.entries(source)
		.filter(([type]) => label(type))
		.map(([type, perClass]) => {
			const stats = [...new Set(Object.values(perClass).flat().map((entry) => entry.Stat))].filter((stat) => STAT_LABELS[stat]);
			const rows = stats.map((stat) => ({
				stat: STAT_LABELS[stat],
				byClass: Object.fromEntries(CLASSES.map((grade) => {
					const entry = perClass[grade]?.find((candidate) => candidate.Stat === stat);
					return [grade, entry ? range(entry.Min, entry.Max) : '—'];
				})),
			}));
			return { type, label: label(type)!, rows };
		})
		.filter((table) => table.rows.length > 0);
}
export const shipStatTables = () => statTables(inventory.BaseStats.Ships, shipLabel);
export const weaponStatTables = () => statTables(inventory.BaseStats.Weapons, weaponLabel);

// ---------- trading ----------

type Economy = {
	Id: string;
	Names: string[];
	Sells: string;
	Needs: string;
	MinSellingPriceMultiplier: number;
	MaxSellingPriceMultiplier: number;
	MinBuyingPriceMultiplier: number;
	MaxBuyingPriceMultiplier: number;
	MinBuyingPriceMultiplierSurge: number;
	MaxBuyingPriceMultiplierSurge: number;
};
const trading = tradingData as unknown as {
	Economies: Economy[];
	Categories: Record<string, { Name: string; ProductMultiplierChangePer100: number; SubstanceMultiplierChangePer100: number }>;
	MinTradingMultiplier: number;
	MaxTradingMultiplier: number;
};

export const categoryName = (id: string): string => titleCase(trading.Categories[id]?.Name ?? id);
// The game's own names for each economy type: the first of the four it shows on the galaxy map.
export const economyName = (id: string): string => trading.Economies.find((economy) => economy.Id === id)?.Names[0] ?? id;

export const economies = () =>
	trading.Economies.map((economy) => ({
		...economy,
		name: economy.Names[0],
		alsoNamed: economy.Names.slice(1),
		sells: categoryName(economy.Sells),
		needs: categoryName(economy.Needs),
	}));

/** Trade loops: follow each economy's goods to the economy that needs them until the chain returns to its start. */
export function tradeLoops(): string[][] {
	const seen = new Set<string>();
	const loops: string[][] = [];
	for (const start of trading.Economies) {
		if (seen.has(start.Id)) continue;
		const loop: string[] = [];
		let current: Economy | undefined = start;
		while (current && !loop.includes(current.Id)) {
			loop.push(current.Id);
			// The next stop is the economy that needs what this one sells.
			const sells: string = current.Sells;
			current = trading.Economies.find((economy) => economy.Needs === sells);
		}
		loop.forEach((id) => seen.add(id));
		if (current?.Id === start.Id) loops.push(loop);
	}
	return loops;
}


/** The trade goods in each category, cheapest first, with their pages. */
export function goodsByCategory(): Array<{ category: string; name: string; goods: Array<{ item: LinkedItem; value: number }> }> {
	const groups = new Map<string, Array<{ item: LinkedItem; value: number }>>();
	for (const good of tradeGoods as Array<{ Id: string; TradeCategory?: string; BaseValueUnits?: number }>) {
		if (!good.TradeCategory || !trading.Categories[good.TradeCategory]?.Name) continue;
		const item = getItemPage(good.Id);
		if (!item) continue;
		groups.set(good.TradeCategory, [...(groups.get(good.TradeCategory) ?? []), { item, value: good.BaseValueUnits ?? 0 }]);
	}
	return [...groups.entries()].map(([category, goods]) => ({
		category,
		name: categoryName(category),
		goods: goods.sort((a, b) => a.value - b.value),
	}));
}
