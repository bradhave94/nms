// Shared data handling for the /creatures pages (species table, species pages, hub, affinities).
import creaturesData from '@datav2/Creatures.json';
import { readableTextOn } from '@utils/contrast';

export type CreatureSpecies = (typeof creaturesData.Species)[number] & {
	SpecialTrait?: string | null;
	PotentialMoveSets?: string[] | null;
	MoveSetSource?: string | null;
};
export type CreatureAffinity = (typeof creaturesData.Affinities)[number];

type SpecialName = { Name: string; Species?: string | null; Trait?: string | null };

const globals = (creaturesData.CreatureGlobals ?? {}) as Record<string, unknown>;
const specialNames = (globals.SpecialCreatureNames ?? {}) as Record<string, SpecialName>;

export const NORMAL_AFFINITY_ICON = 'moves--move.pet.attack.png';

export const affinities: CreatureAffinity[] = creaturesData.Affinities ?? [];
export const affinityById = new Map<string, CreatureAffinity>(affinities.map((a) => [a.Id, a] as const));
export const affinityByDisplay = new Map<string, CreatureAffinity>(
	affinities.map((a) => [a.DisplayName.toLowerCase(), a] as const)
);

/** The Xeno Arena matchup wheel (each affinity beats one and loses to one). */
export const MATCHUPS: { affinityId: string; strongAgainstId: string; weakAgainstId: string }[] = [
	{ affinityId: 'Fire', strongAgainstId: 'Cold', weakAgainstId: 'Radioactive' },
	{ affinityId: 'Cold', strongAgainstId: 'Barren', weakAgainstId: 'Fire' },
	{ affinityId: 'Radioactive', strongAgainstId: 'Fire', weakAgainstId: 'Toxic' },
	{ affinityId: 'Toxic', strongAgainstId: 'Lush', weakAgainstId: 'Mech' },
	{ affinityId: 'Mech', strongAgainstId: 'Toxic', weakAgainstId: 'Weird' },
	{ affinityId: 'Weird', strongAgainstId: 'Mech', weakAgainstId: 'Barren' },
	{ affinityId: 'Barren', strongAgainstId: 'Radioactive', weakAgainstId: 'Cold' },
	{ affinityId: 'Lush', strongAgainstId: 'Weird', weakAgainstId: 'Toxic' },
];
export const matchupFor = (affinityId: string | null | undefined) =>
	MATCHUPS.find((m) => m.affinityId === affinityId) ?? null;

/** Colour-coded species table: one game-ish hue per affinity / rarity / battle / move area. */
export const AFFINITY_COLOURS: Record<string, string> = {
	Fire: '8B2500',
	Frost: '1A5276',
	Toxic: '4A5A00',
	Desert: '7D6608',
	Tropical: '1B6B2A',
	Radioactive: '5B2C6F',
	Mechanical: '2C3E50',
	Anomalous: '6C3483',
	Physical: '333333',
	Varies: '333333',
	None: '1F2731',
};
export const RARITY_COLOURS: Record<string, string> = {
	Common: '2E4053',
	Uncommon: '1A5276',
	Rare: '6C3483',
	SuperRare: '922B21',
	Unknown: '333333',
};
export const BATTLE_COLOURS: Record<string, string> = { Yes: '1B6B2A', No: '4A0E0E' };
export const AREA_COLOURS: Record<string, string> = {
	Ground: '5D4E37',
	Air: '2E5984',
	Water: '1A5276',
	Space: '2C3E50',
	Cave: '4A3728',
	Unknown: '333333',
};

export const swatch = (hex: string | undefined): string => {
	const c = hex ?? '333333';
	return `--c:#${c};background:#${c};color:${readableTextOn(c)}`;
};

export const toTitleCase = (value: string): string =>
	value
		.replace(/[_-]+/g, ' ')
		.trim()
		.split(/\s+/)
		.map((word) => {
			const lower = word.toLowerCase();
			if (!lower) return word;
			if (lower === 'pvp') return 'PvP';
			if (lower === 'pve') return 'PvE';
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');

/** Sentence case for game enums: "SuperRare" -> "Super rare", "MECH" -> "Mech". */
export const sentence = (value: string | null | undefined): string => {
	if (!value) return 'Unknown';
	const spaced = value
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim()
		.toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/**
 * Display name for a species.
 *
 * The game's special creature names (`CreatureGlobals.SpecialCreatureNames`) belong to one creature
 * id each. The data export also copies a special name onto every species that shares its battle
 * PetTag, so HERMITCRAB came through as a second "Aeron Crab (Shellseeker)" (the name belongs to
 * WALKER_CRAB), which made the species table list the same name twice. A special name now only
 * applies to its own id; other species fall back to the generic name built from the id, the same
 * way every other ecosystem creature is named ("Crab", "Space Floater").
 */
// readable names where the id alone runs words together
const GENERIC_NAMES: Record<string, string> = { HERMITCRAB: 'Hermit Crab' };

export const speciesNames = (s: CreatureSpecies): { name: string; subtitle: string | null; trait: string | null } => {
	const own = specialNames[s.Id];
	if (own) return { name: own.Name, subtitle: own.Species ?? null, trait: own.Trait ?? s.SpecialTrait ?? null };
	const borrowed = Object.entries(specialNames).some(
		([id, special]) => id !== s.Id && special.Name === s.Name
	);
	if (borrowed) return { name: GENERIC_NAMES[s.Id] ?? toTitleCase(s.Id), subtitle: null, trait: null };
	return { name: s.Name, subtitle: s.SpeciesSubtitle?.trim() || null, trait: s.SpecialTrait ?? null };
};

export const speciesLabel = (s: CreatureSpecies): string => {
	const { name, subtitle } = speciesNames(s);
	return subtitle ? `${name} (${subtitle})` : name;
};

export const allSpecies: CreatureSpecies[] = ((creaturesData.Species ?? []) as CreatureSpecies[]).filter(
	(s) => Boolean(s?.Id && s?.Name)
);

/** How many species share each display label (should be 1 each; used to qualify titles if not). */
export const speciesLabelCounts = allSpecies.reduce<Map<string, number>>((counts, s) => {
	const label = speciesLabel(s);
	counts.set(label, (counts.get(label) ?? 0) + 1);
	return counts;
}, new Map());

export const speciesIcon = (s: CreatureSpecies): string => s.BattleAffinityIcon ?? s.Icon ?? NORMAL_AFFINITY_ICON;

/** Affinity shown in the table: species that can't battle have none, battlers without a forced one vary. */
export const speciesAffinity = (s: CreatureSpecies): string =>
	s.CanBeUsedInBattle ? (s.BattleForcedAffinityDisplay ?? 'Varies') : 'None';

export type SpeciesRow = {
	id: string;
	name: string;
	subtitle: string | null;
	href: string;
	icon: string;
	affinity: string;
	affinityIcon: string | null;
	battle: 'Yes' | 'No';
	rarity: string;
	rarityLabel: string;
	area: string;
};

export const speciesRows = (): SpeciesRow[] =>
	allSpecies
		.map((s) => {
			const { name, subtitle } = speciesNames(s);
			const affinity = speciesAffinity(s);
			const aff = affinityByDisplay.get(affinity.toLowerCase());
			return {
				id: s.Id,
				name,
				subtitle,
				href: `/creatures/${s.Id}/`,
				icon: speciesIcon(s),
				affinity,
				affinityIcon: aff?.Icon ?? (affinity === 'Physical' ? NORMAL_AFFINITY_ICON : null),
				battle: s.CanBeUsedInBattle ? 'Yes' : 'No',
				rarity: s.Rarity ?? 'Unknown',
				rarityLabel: sentence(s.Rarity),
				area: s.MoveArea ?? 'Unknown',
			} satisfies SpeciesRow;
		})
		.sort((a, b) => a.name.localeCompare(b.name) || (a.subtitle ?? '').localeCompare(b.subtitle ?? ''));

export const counts = {
	species: allSpecies.length,
	battleReady: allSpecies.filter((s) => s.CanBeUsedInBattle).length,
	affinities: affinities.length,
	moves: creaturesData.BattleMoves?.length ?? 0,
	moveSets: creaturesData.MoveSets?.length ?? 0,
	arenaModes: creaturesData.ArenaModes?.length ?? 0,
	behaviours: creaturesData.Behaviours?.length ?? 0,
	accessories: creaturesData.PetAccessories?.length ?? 0,
};
