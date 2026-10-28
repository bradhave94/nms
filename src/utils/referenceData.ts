// Reference tables from the extractor that aren't items: where items come from (expeditions,
// Twitch drops, the Quicksilver shop, platform rewards, fixed-price exchanges), the research
// trees that sell blueprints, frigate traits and settlement perks. Read directly, like
// Titles.json: none of these rows get an item page of their own.
import itemSourcesData from '../datav2/ItemSources.json';
import researchTreesData from '../datav2/ResearchTrees.json';
import frigateTraitsData from '../datav2/FrigateTraits.json';
import settlementPerksData from '../datav2/SettlementPerks.json';
import { getById } from './lookup';
import { getItemPage, type LinkedItem } from './playerUnlocks';

// ---------- item sources ----------

export type Expedition = { Number: number; Remix: number; DisplayNumber: number; Name: string };
export type Cost = { Type: 'Product' | 'Substance' | 'Currency'; Id: string; Amount: number };
export type Grant =
	| { Type: 'Product' | 'Technology'; Id: string; AmountMin: number; AmountMax: number }
	| { Type: 'Weapon'; Id: string; Name: string | null };
export type Exchange = {
	Id: string;
	Puzzle: string;
	Race: string;
	Interaction: string;
	Category: string;
	Option: string | null;
	Cost: Cost;
	Gives: Grant[];
};
export type ItemSource =
	| { Type: 'Expedition'; Expeditions: number[]; Phases: number[]; SwitchExclusive: boolean }
	| { Type: 'Twitch'; Drop: string }
	| { Type: 'Platform'; Reward: string }
	| { Type: 'Quicksilver'; Shop: number; MissionTier: number }
	| { Type: 'Exchange'; Exchange: string };

const itemSources = itemSourcesData as {
	Expeditions: Expedition[];
	Exchanges: Exchange[];
	Items: Record<string, ItemSource[]>;
};

// Reward tables number expeditions as players see them (DisplayNumber: Swarm is 22), not by
// the internal season Number (46), e.g. SWARM_GUN lists expedition 22.
const expeditionByNumber = new Map(
	itemSources.Expeditions.filter((expedition) => expedition.Remix === 0).map((expedition) => [expedition.DisplayNumber, expedition]),
);
const exchangeById = new Map(itemSources.Exchanges.map((exchange) => [exchange.Id, exchange]));

const CURRENCY_LABELS: Record<string, string> = { Units: 'Units', Nanites: 'Nanites', Specials: 'Quicksilver' };

/** "5 × Preserved Grub" or "1,000 Units", linking the item when it has a page. */
export type CostLabel = { amount: string; name: string; url?: string };
export function costLabel(cost: { Type: string; Id: string; Amount: number }): CostLabel {
	const amount = cost.Amount.toLocaleString('en-US');
	if (cost.Type === 'Currency') return { amount, name: CURRENCY_LABELS[cost.Id] ?? cost.Id };
	const page = getItemPage(cost.Id);
	return { amount: `${amount} ×`, name: page?.name ?? getById(cost.Id)?.Name ?? cost.Id, url: page?.url };
}

// The dialog's AlienRace (Traders, Explorers, Warriors are the Gek, Korvax and Vy'keen) and the
// planet type its encounter appears on (AlienPuzzleCategory).
const RACE_NAMES: Record<string, string> = { Traders: 'Gek', Explorers: 'Korvax', Warriors: "Vy'keen" };
const ENCOUNTER_PLACES: Record<string, string> = {
	BiomeCold: 'on a frozen planet',
	BiomeDusty: 'on a dusty planet',
	BiomeLush: 'on a lush planet',
	ExtremeWeather: 'on a planet with extreme weather',
};

/** Who offers an exchange and where, from the dialog's own fields. */
export function exchangeWho(exchange: Pick<Exchange, 'Puzzle' | 'Race' | 'Interaction' | 'Category'>): string {
	// 7.10's forsaken trader dialogs (the game names the trader UI_SPOOK_SHOP_NAME, "Forsaken Trader").
	if (exchange.Puzzle.replace(/^\?/, '').startsWith('D_SPOOK_SHOP')) return 'a forsaken trader';
	// The game names the LibraryMap terminal UI_LIBRARY_MAP_NAME, "Local Information Repository".
	if (exchange.Interaction === 'LibraryMap') return 'a Local Information Repository';
	const race = RACE_NAMES[exchange.Race];
	const place = ENCOUNTER_PLACES[exchange.Category];
	// NPC_Scavenger encounters are the game's "Scavenger" (UI_EXPED_SCAVENGER_NAME).
	const role = exchange.Interaction === 'NPC_Scavenger' ? ' scavenger' : '';
	const who = race ? `a ${race}${role}` : `an alien${role}`;
	return `${who} you meet${place ? ` ${place}` : ''}`;
}

/** "?"-prefixed dialogs are follow-up steps of a longer conversation, not something you can repeat at will. */
export const isFollowUpStep = (exchange: Pick<Exchange, 'Puzzle'>): boolean =>
	exchange.Puzzle.startsWith('?') && !exchange.Puzzle.startsWith('?D_SPOOK_SHOP');

const amountText = (low: number, high: number): string =>
	low === high ? low.toLocaleString('en-US') : `${low.toLocaleString('en-US')}–${high.toLocaleString('en-US')}`;

export type ObtainLine =
	| { kind: 'text'; text: string }
	| { kind: 'exchange'; option: string | null; cost: CostLabel; currency: boolean; amount: string; who: string; followUp: boolean };

/** One line per way to get an item: identical sources are merged (an item sold in many shop rotations reads once). */
export function obtainLines(itemId: string): ObtainLine[] {
	const lines: ObtainLine[] = [];
	const seen = new Set<string>();
	const push = (key: string, line: ObtainLine) => {
		if (seen.has(key)) return;
		seen.add(key);
		lines.push(line);
	};
	for (const source of itemSources.Items[itemId] ?? []) {
		if (source.Type === 'Expedition') {
			for (const number of source.Expeditions) {
				const expedition = expeditionByNumber.get(number);
				// StageIds -1 marks rewards outside the phases (final ships, eggs); its meaning isn't certain, so say nothing.
				const shownPhases = source.Phases.filter((phase) => phase > 0);
				const phases = shownPhases.length ? `, phase ${shownPhases.join(', ')}` : '';
				const name = expedition ? `: ${expedition.Name}` : '';
				const switchOnly = source.SwitchExclusive ? ' (Nintendo Switch only)' : '';
				push(`exp-${number}-${shownPhases}-${switchOnly}`, { kind: 'text', text: `Expedition ${number}${name} reward${phases}${switchOnly}` });
			}
		} else if (source.Type === 'Twitch') {
			push('twitch', { kind: 'text', text: 'Twitch drop reward' });
		} else if (source.Type === 'Platform') {
			push('platform', { kind: 'text', text: 'Platform reward' });
		} else if (source.Type === 'Quicksilver') {
			push('quicksilver', { kind: 'text', text: 'Quicksilver shop (Space Anomaly), in rotation' });
		} else {
			const exchange = exchangeById.get(source.Exchange);
			const given = exchange?.Gives.find((grant) => grant.Id === itemId);
			if (!exchange || !given || given.Type === 'Weapon') continue;
			const cost = costLabel(exchange.Cost);
			const who = exchangeWho(exchange);
			const amount = amountText(given.AmountMin, given.AmountMax);
			push(`exch-${who}-${exchange.Option}-${JSON.stringify(exchange.Cost)}-${amount}`, {
				kind: 'exchange',
				option: exchange.Option,
				cost,
				currency: exchange.Cost.Type === 'Currency',
				amount,
				who,
				followUp: isFollowUpStep(exchange),
			});
		}
	}
	return lines;
}

/** What an item can be traded for: exchanges that take it as their price. */
export type TradeLine = { option: string | null; amount: number; who: string; followUp: boolean; gives: Array<{ name: string; amount?: string; url?: string }> };
export function tradeLines(itemId: string): TradeLine[] {
	const lines = new Map<string, TradeLine>();
	for (const exchange of itemSources.Exchanges) {
		if (exchange.Cost.Id !== itemId || exchange.Cost.Type === 'Currency') continue;
		const gives = exchange.Gives.map((grant) => {
			if (grant.Type === 'Weapon') return { name: grant.Name ?? 'a Multi-Tool' };
			const page = getItemPage(grant.Id);
			const amount = grant.AmountMax > 1 ? amountText(grant.AmountMin, grant.AmountMax) : undefined;
			return { name: page?.name ?? getById(grant.Id)?.Name ?? grant.Id, amount, url: page?.url };
		});
		const line = { option: exchange.Option, amount: exchange.Cost.Amount, who: exchangeWho(exchange), followUp: isFollowUpStep(exchange), gives };
		lines.set(JSON.stringify(line), line);
	}
	return [...lines.values()];
}

// ---------- research trees ----------

export type ResearchNode = { Id: string; Parent: string | null; Price: number | null };
export type ResearchTree = { Name: string | null; Cost: { Type: string; Id: string } | null; Nodes: ResearchNode[] };
export type ResearchGroup = { Id: string; Name: string | null; Trees: ResearchTree[] };

export const researchGroups = (researchTreesData as { Groups: ResearchGroup[] }).Groups;

export type Currency = { id: string; name: string; url?: string; icon?: string | null };

/** The currency a tree's blueprints cost: Salvaged Data, Nanites, a token item… */
export function treeCurrency(tree: ResearchTree): Currency | null {
	if (!tree.Cost) return null;
	if (tree.Cost.Type === 'Currency') return { id: tree.Cost.Id, name: CURRENCY_LABELS[tree.Cost.Id] ?? tree.Cost.Id };
	const page = getItemPage(tree.Cost.Id);
	return { id: tree.Cost.Id, name: page?.name ?? getById(tree.Cost.Id)?.Name ?? tree.Cost.Id, url: page?.url, icon: page?.icon };
}

/**
 * Research groups with at least one priced tree whose blueprints have item pages (7.10's
 * corvette tree has none, and SpecialBaseParts is an unnamed, unpriced placeholder).
 * The S9 groups belong to the Utopia expedition (their base-part tree is "Utopia Research
 * Stations") and share names with the main ones, so they're labelled.
 */
export function visibleResearchGroups(): ResearchGroup[] {
	return researchGroups
		.map((group) => ({
			...group,
			Name: group.Id.startsWith('S9') ? `${group.Name ?? group.Id} (Utopia)` : group.Name,
			Trees: group.Trees.filter((tree) => tree.Cost && tree.Nodes.some((node) => getItemPage(node.Id))),
		}))
		.filter((group) => group.Trees.length > 0);
}

let priceById: Map<string, { price: number; currency: Currency }> | undefined;
/** A blueprint's research price and the currency it's paid in, from the first tree that sells it. */
export function blueprintPrice(id: string): { price: number; currency: Currency } | undefined {
	if (!priceById) {
		priceById = new Map();
		for (const group of visibleResearchGroups())
			for (const tree of group.Trees) {
				const currency = treeCurrency(tree);
				if (!currency) continue;
				for (const node of tree.Nodes)
					if (node.Price !== null && !priceById.has(node.Id)) priceById.set(node.Id, { price: node.Price, currency });
			}
	}
	return priceById.get(id);
}

export const researchAnchor = (group: ResearchGroup): string => group.Id.toLowerCase();

export type BlueprintLine = {
	stations: Array<{ name: string; url: string }>;
	tree: string;
	price: number | null;
	currency: Currency | null;
	after?: LinkedItem;
};

/** Where an item's blueprint is sold. Trees that sell it the same way (same tree, price and parent) share one line. */
export function blueprintLines(item: { Id: string }): BlueprintLine[] {
	const lines = new Map<string, BlueprintLine>();
	for (const group of visibleResearchGroups()) {
		for (const tree of group.Trees) {
			const node = tree.Nodes.find((entry) => entry.Id === item.Id);
			if (!node) continue;
			const currency = treeCurrency(tree);
			const key = `${tree.Name}|${node.Price}|${currency?.name}|${node.Parent ?? ''}`;
			const station = { name: group.Name ?? group.Id, url: `/research-trees/#${researchAnchor(group)}` };
			const existing = lines.get(key);
			if (existing) {
				if (!existing.stations.some((entry) => entry.name === station.name)) existing.stations.push(station);
				continue;
			}
			lines.set(key, { stations: [station], tree: tree.Name ?? '', price: node.Price, currency, after: getItemPage(node.Parent) });
		}
	}
	return [...lines.values()];
}

// ---------- frigate traits ----------

export type FrigateTrait = {
	Id: string;
	Name: string;
	Stat: string;
	Strength: string;
	Value: number;
	Effect: string | null;
	Beneficial: boolean;
	OfferedOn: Array<{ Class: string; Label: string; Weight: number }>;
};

export const frigateTraits = frigateTraitsData as FrigateTrait[];


const STRENGTH_ORDER = ['Primary', 'SecondaryLarge', 'SecondaryMedium', 'SecondarySmall', 'TertiaryLarge', 'TertiaryMedium', 'TertiarySmall', 'NegativeSmall', 'NegativeMedium', 'NegativeLarge'];
export const strengthLabel = (strength: string): string =>
	strength.replace(/^(Primary|Secondary|Tertiary|Negative)(Small|Medium|Large)?$/, (_, tier, size) =>
		tier === 'Negative' ? `Negative (${(size ?? '').toLowerCase()})` : size ? `${tier} (${size.toLowerCase()})` : tier,
	);

export type TraitGroup = { stat: string; heading: string; traits: FrigateTrait[] };

/** Traits by the stat they change, strongest first; the heading is the game's own stat label. */
export function groupTraits(list: FrigateTrait[] = frigateTraits): TraitGroup[] {
	const groups = new Map<string, FrigateTrait[]>();
	for (const trait of list) groups.set(trait.Stat, [...(groups.get(trait.Stat) ?? []), trait]);
	return [...groups.entries()]
		.map(([stat, traits]) => ({
			stat,
			heading: (traits.find((trait) => trait.Effect)?.Effect ?? stat).replace(/^[+-]?\d+%?\s*/, ''),
			traits: traits.sort(
				(a, b) => STRENGTH_ORDER.indexOf(a.Strength) - STRENGTH_ORDER.indexOf(b.Strength) || a.Name.localeCompare(b.Name),
			),
		}))
		.sort((a, b) => b.traits.length - a.traits.length || a.heading.localeCompare(b.heading));
}

/** The frigate types a trait can roll on (the game's class names), merged ("Organic" covers both deep-space pools). */
export function offeredOn(trait: FrigateTrait): string {
	if (trait.OfferedOn.length === 0) return trait.Strength === 'Primary' ? 'Set by frigate type' : '—';
	return [...new Set(trait.OfferedOn.map((entry) => entry.Label))].join(', ');
}

// ---------- settlement perks ----------

export type SettlementPerk = {
	Id: string;
	Name: string;
	Description: string | null;
	IsNegative: boolean;
	IsStarter: boolean;
	IsProc: boolean;
	IsJob: boolean;
	IsBlessing: boolean;
	Effects: Array<{ Stat: string; Label: string; Text: string | null; Strength: string; Min: number; Max: number; ChangesPopulation: boolean }>;
	Buildings: string[];
};

export const settlementPerks = settlementPerksData as SettlementPerk[];

const signed = (value: number): string => (value > 0 ? `+${value.toLocaleString('en-US')}` : value.toLocaleString('en-US'));
export const effectRange = (effect: { Min: number; Max: number }): string =>
	effect.Min === effect.Max ? signed(effect.Min) : `${signed(effect.Min)} to ${signed(effect.Max)}`;

/**
 * Some perk names and descriptions are templates the game fills with random words per settlement
 * (%BLESSING%, %BAR_ADJ% %BAR%, %JOB_STAT%…). Show the fixed words with "…" for the random part,
 * or "Name varies" when nothing fixed is left.
 */
export function templateText(text: string | null, whenEmpty: string): string {
	if (!text) return whenEmpty;
	const filled = text.replace(/%[A-Z_]+%/g, '…').replace(/\s+/g, ' ').trim();
	return /[A-Za-z]{2}/.test(filled.replace(/…/g, '')) ? filled : whenEmpty;
}
export const perkName = (name: string): string => templateText(name, 'Name varies');

export type PerkGroup = { key: string; heading: string; lead: string; perks: SettlementPerk[] };

/** Perks that read the same (same shown name, effects and description) are listed once. */
function distinctPerks(list: SettlementPerk[]): SettlementPerk[] {
	const seen = new Set<string>();
	return list.filter((perk) => {
		const key = JSON.stringify([perkName(perk.Name), perk.Effects, perk.Description, perk.IsNegative, perk.IsStarter, perk.IsBlessing]);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function groupPerks(list: SettlementPerk[] = distinctPerks(settlementPerks)): PerkGroup[] {
	const byName = (a: SettlementPerk, b: SettlementPerk) => perkName(a.Name).localeCompare(perkName(b.Name));
	const groups: PerkGroup[] = [
		{ key: 'starting-good', heading: 'Starting perks: positive', lead: 'A settlement can start with these when you take it over.', perks: list.filter((p) => p.IsStarter && !p.IsNegative) },
		{ key: 'starting-bad', heading: 'Starting perks: negative', lead: 'Drawbacks a settlement can start with.', perks: list.filter((p) => p.IsStarter && p.IsNegative) },
		{ key: 'blessings', heading: 'Blessings', lead: 'Granted or lost through settlement events.', perks: list.filter((p) => p.IsBlessing) },
		{ key: 'events', heading: 'Other perks', lead: 'Perks a settlement gains later. Many have names the game picks at random.', perks: list.filter((p) => !p.IsStarter && !p.IsBlessing) },
	];
	return groups.map((group) => ({ ...group, perks: [...group.perks].sort(byName) })).filter((group) => group.perks.length > 0);
}
