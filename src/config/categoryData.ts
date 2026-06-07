import type { DatasetKey } from './categories.js';
import type { Item } from '@utils/lookup.js';
import { Buildings } from '@datav2/index';
import { ConstructedTechnology } from '@datav2/index';
import { Corvette } from '@datav2/index';
import { Curiosities } from '@datav2/index';
import { Exocraft } from '@datav2/index';
import { Fish } from '@datav2/index';
import { Food } from '@datav2/index';
import { Others } from '@datav2/index';
import { Products } from '@datav2/index';
import { RawMaterials } from '@datav2/index';
import { Starships } from '@datav2/index';
import { Technology } from '@datav2/index';
import { TechnologyModule } from '@datav2/index';
import { Trade } from '@datav2/index';
import { Upgrades } from '@datav2/index';

export const datasetsByKey: Record<DatasetKey, Item[]> = {
	Products: Products as Item[],
	Buildings: Buildings as Item[],
	Fish: Fish as Item[],
	Upgrades: Upgrades as Item[],
	RawMaterials: RawMaterials as Item[],
	Food: Food as Item[],
	Exocraft: Exocraft as Item[],
	Starships: Starships as Item[],
	Corvette: Corvette as Item[],
	Curiosities: Curiosities as Item[],
	Others: Others as Item[],
	Trade: Trade as Item[],
	ConstructedTechnology: ConstructedTechnology as Item[],
	Technology: Technology as Item[],
	TechnologyModule: TechnologyModule as Item[],
};

export function getCategoryDataset(keys: DatasetKey[]): Item[] {
	return keys.flatMap((key) => datasetsByKey[key]);
}
