import * as dataSources from '../datav2/index.js';
import rules from '../datav2/PowerRules.json';
import manifest from '../datav2/extraction-manifest.json';
import { electricalValues, isPlanetPowerPart, type GridData } from './basePower.js';
import { getSlug, type Item } from './lookup.js';

type Buildable = Item & {
	LinkGridData?: GridData | null;
	BuildableOnPlanetBase?: boolean;
	ShowInBuildMenu?: boolean;
};

export function buildPowerCatalog() {
	const items = Object.values(dataSources).flatMap((source) => Array.isArray(source) ? source as Buildable[] : []);
	const byId = new Map(items.map((item) => [item.Id, item]));
	const describe = (item: Item) => ({ id: item.Id, name: item.Name, icon: item.Icon, url: getSlug(item) });
	const planetaryParts = items.filter((item) => isPlanetPowerPart(item) && item.LinkGridData);
	const devices = planetaryParts.filter((item) => (item.RequiredItems?.length ?? 0) > 0)
		.map((item) => ({ ...describe(item), ...electricalValues(item.LinkGridData!) }))
		.filter((item) => item.consumption > 0)
		.sort((a, b) => a.name.localeCompare(b.name));
	const zeroDrawDevices = planetaryParts.filter((item) => item.LinkGridData!.Network === 'Power')
		.map((item) => ({ ...describe(item), ...electricalValues(item.LinkGridData!) }))
		.filter((item) => item.consumption === 0 && item.generation === 0 && item.storage === 0)
		.sort((a, b) => a.name.localeCompare(b.name));
	const equipment = ['U_SOLAR_S', 'U_BATTERY_S', 'U_GENERATOR_S', 'U_BIOGENERATOR'].map((id) => {
		const item = byId.get(id);
		if (!item?.LinkGridData || !item.RequiredItems?.length) throw new Error(`Power equipment metadata missing: ${id}`);
		return { ...describe(item), ...electricalValues(item.LinkGridData), recipe: item.RequiredItems.map((ingredient) => {
			const material = byId.get(ingredient.Id);
			if (!material) throw new Error(`Power material missing: ${ingredient.Id}`);
			return { ...describe(material), quantity: ingredient.Quantity };
		}) };
	});
	const solar = equipment.find((item) => item.id === 'U_SOLAR_S')!;
	const battery = equipment.find((item) => item.id === 'U_BATTERY_S')!;
	if (solar.generation <= 0 || battery.storage <= 0) throw new Error('Invalid extracted power equipment');
	return { devices, zeroDrawDevices, equipment, panelRate: solar.generation, batteryCapacity: battery.storage,
		cycleSeconds: rules.DayCycleSeconds, hotspotStrengths: rules.HotspotClassStrengths.Power,
		gameVersion: manifest.gameVersion, rulesProvenance: rules.Provenance as {
			SteamBuildId?: string; GameVersion?: string; ObservedDate?: string; CompilerVersion: string;
		} };
}

export type PowerCatalog = ReturnType<typeof buildPowerCatalog>;
