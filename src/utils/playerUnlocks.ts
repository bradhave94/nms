// Player titles for /titles. Titles.json comes from the extractor (playertitledata plus title
// rewards from rewardtable) and is read here directly, not through the item catalog: titles
// don't get item pages. Only the titles unlocked by owning a product are also items.
import titlesData from '../datav2/Titles.json';
import { getRouteEligibleCatalog } from './routeCatalog';

export type TitleUnlock = {
	Type: 'Stat' | 'Product' | 'Mission' | 'Trophy' | 'Interaction' | 'None';
	Stat?: string;
	Value?: number;
	ProductId?: string;
	MissionId?: string;
	TrophyId?: string;
	Interaction?: string;
	Race?: string;
	LeveledStatRank?: number;
};

export type GrantingReward = { Id: string; RewardTable: string };

export type PlayerTitle = {
	Id: string;
	Name: string;
	Hint: string | null;
	Unlocked: string | null;
	Unlock: TitleUnlock;
	GrantedByRewards: GrantingReward[];
	RevealedBy: string | null;
	BlockedInSeasons: number[];
	UnlocksSpecials: string[];
};

export type LinkedItem = { id: string; name: string; url: string; icon: string | null };

let itemPages: Map<string, LinkedItem> | undefined;

/** Items that have a page, by Id (aliases resolve to the page they share). */
export function getItemPage(id: string | null | undefined): LinkedItem | undefined {
	if (!id) return undefined;
	if (!itemPages) {
		itemPages = new Map();
		for (const { item, url, aliases } of getRouteEligibleCatalog()) {
			const page: LinkedItem = {
				id: String(item.Id),
				name: String(item.Name),
				url,
				icon: typeof item.Icon === 'string' && item.Icon ? item.Icon : null,
			};
			for (const record of [item, ...aliases]) itemPages.set(String(record.Id), page);
		}
	}
	return itemPages.get(id);
}

export const titles = titlesData as PlayerTitle[];

/** "Mind Harvester %NAME%" -> ["Mind Harvester ", ""]: the text before and after the player's name. */
export function titleParts(name: string): [string, string] {
	const at = name.indexOf('%NAME%');
	return at < 0 ? [name, ''] : [name.slice(0, at), name.slice(at + '%NAME%'.length)];
}

/** The title with the player's name written as "Traveller", for headings and structured data. */
export const titleLabel = (name: string): string => name.replace('%NAME%', 'Traveller').trim();

const USELESS_HINT = /^\?+$/;

/** What earned the title, in the game's words: its earned text, else its hint. */
export function unlockText(title: PlayerTitle): string | null {
	return title.Unlocked ?? (title.Hint && !USELESS_HINT.test(title.Hint) ? title.Hint : null);
}

/** The hint the game shows before a title is earned, when it adds something to the unlock text. */
export function extraHint(title: PlayerTitle): string | null {
	if (!title.Hint || USELESS_HINT.test(title.Hint) || title.Hint === unlockText(title)) return null;
	return title.Hint;
}

/** Milestone ladders store their rung as a rank; several rungs share the same text without it. */
export const titleRank = (title: PlayerTitle): number | null => title.Unlock.LeveledStatRank ?? null;

/** Text a filter matches on: the title without the player-name placeholder, plus how to unlock it. */
export const titleSearchText = (title: PlayerTitle): string =>
	[titleParts(title.Name).join(' '), unlockText(title), extraHint(title)]
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

export type TitleGroup = { key: string; heading: string; lead: string; titles: PlayerTitle[] };

const STANDING_STAT = /_STAND(ING)?$/;

/** A ladder's rung: its rank when it has one, else its stat threshold. Ranked rungs follow the threshold ones. */
const rung = (title: PlayerTitle): [number, number] => {
	const rank = titleRank(title);
	return rank === null ? [0, title.Unlock.Value ?? 0] : [1, rank];
};

/** Titles grouped by how they unlock; each stat's ladder stays in order, ladders ordered by their hint. */
export function groupTitles(list: PlayerTitle[] = titles): TitleGroup[] {
	const ladderName = new Map<string, string>();
	for (const title of list) {
		const stat = title.Unlock.Stat;
		const hint = extraHint(title) ?? title.Hint;
		if (stat && hint && !USELESS_HINT.test(hint) && !ladderName.has(stat)) ladderName.set(stat, hint);
	}
	const ladder = (title: PlayerTitle): string => {
		const stat = title.Unlock.Stat ?? '';
		return ladderName.get(stat) ?? unlockText(title) ?? stat;
	};
	const byThreshold = (a: PlayerTitle, b: PlayerTitle) => {
		const [aKind, aValue] = rung(a);
		const [bKind, bValue] = rung(b);
		return (
			ladder(a).localeCompare(ladder(b), 'en') ||
			(a.Unlock.Stat ?? '').localeCompare(b.Unlock.Stat ?? '') ||
			aKind - bKind ||
			aValue - bValue
		);
	};
	const rewardOnly = (t: PlayerTitle) => t.Unlock.Type === 'None' && t.GrantedByRewards.length > 0;
	const groups: TitleGroup[] = [
		{
			key: 'standing',
			heading: 'Faction and guild standing',
			lead: 'Earned by raising your standing with an alien race or guild. Each rank adds a title.',
			titles: list.filter((t) => t.Unlock.Type === 'Stat' && STANDING_STAT.test(t.Unlock.Stat ?? '')).sort(byThreshold),
		},
		{
			key: 'milestones',
			heading: 'Milestones',
			lead: 'Earned by reaching a milestone: distance walked, discoveries, kills, battles won and more.',
			titles: list
				.filter((t) => (t.Unlock.Type === 'Stat' && !STANDING_STAT.test(t.Unlock.Stat ?? '')) || (t.Unlock.Type === 'None' && !rewardOnly(t)))
				.sort(byThreshold),
		},
		{
			key: 'items',
			heading: 'Items and rewards',
			lead: 'Earned by owning an item or claiming a reward: Quicksilver shop titles, expedition rewards and a few vehicles.',
			titles: list.filter((t) => t.Unlock.Type === 'Product' || rewardOnly(t)),
		},
		{
			key: 'missions',
			heading: 'Story and missions',
			lead: 'Earned through missions and story progress, including owning certain starships.',
			titles: list.filter((t) => t.Unlock.Type === 'Mission'),
		},
		{
			key: 'encounters',
			heading: 'Monoliths and encounters',
			lead: 'Earned at monoliths, plaques and other alien encounters.',
			titles: list.filter((t) => t.Unlock.Type === 'Interaction'),
		},
		{
			key: 'achievements',
			heading: 'Achievements',
			lead: 'Earned with a game achievement.',
			titles: list.filter((t) => t.Unlock.Type === 'Trophy'),
		},
	];
	return groups.filter((group) => group.titles.length > 0);
}

/** Row anchor for a title: /titles/#t-spookpackage */
export const titleAnchor = (id: string): string => id.toLowerCase().replace(/_/g, '-');

/** Where a reward table hands out its reward. */
export function rewardSource(table: string): string {
	const expedition = table.match(/^SeasonRewardTable(\d+)$/);
	if (expedition) return `Expedition ${expedition[1]}`;
	switch (table) {
		case 'TwitchRewardTable':
			return 'Twitch drop';
		case 'EntitlementTable':
			return 'Platform bonus';
		case 'SpecialRewardTable':
			return 'Special reward';
		case 'InteractionTable':
			return 'Interaction reward';
		case 'NPCPlanetSiteTable':
			return 'Planet site reward';
		default:
			return 'Reward';
	}
}
