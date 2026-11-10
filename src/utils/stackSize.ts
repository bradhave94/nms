// In-game stack size on Normal difficulty.
//
// datav2 MaxStackSize is the product/substance table's StackMultiplier, not the
// stack you see in the Exosuit. The game multiplies that by
// GcDifficultyInventoryStackSizeOptionData.MaxProductStackSizes or
// MaxSubstanceStackSizes for the current inventory, then caps the result at
// ProductStackLimit / SubstanceStackLimit. Those tables live in
// METADATA/GAMESTATE/DIFFICULTYCONFIG.MBIN (cGcDifficultyConfig).
//
// The Normal difficulty preset selects the stack-limits option named High
// (INV_SIZE_EASY). Under it, a product with StackMultiplier 10 stacks to 100
// in the Exosuit and 200 in a freighter or storage container. Substances with
// StackMultiplier 1 stack to 9,999 everywhere, because 1 x 9,999 is already
// at the substance cap.
import limits from '../data/stackLimits.json';

export type InventorySlot = 'Personal' | 'Freighter' | 'Chest';

export type StackItem = {
	Slug?: string;
	MaxStackSize?: number;
};

type OptionName = keyof typeof limits.options;

const optionName = limits.normalPresetOption;
if (!(optionName in limits.options)) {
	throw new Error(`Unknown stack-limits option in stackLimits.json: ${optionName}`);
}
const option = limits.options[optionName as OptionName];

/** Raw materials come from the substance table; everything else with a stack multiplier is a product. */
export const isSubstanceItem = (item: StackItem): boolean =>
	(item.Slug ?? '').replace(/^\/+/, '').startsWith('raw/');

/**
 * Stack size in that inventory on Normal difficulty, or undefined when the
 * item has no stack (missing, 0, or a non-positive result).
 */
export function inventoryStackSize(item: StackItem, inventory: InventorySlot = 'Personal'): number | undefined {
	const base = item.MaxStackSize;
	if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) return undefined;

	const substance = isSubstanceItem(item);
	const multiplier = substance ? option.substances[inventory] : option.products[inventory];
	const cap = substance ? option.substanceStackLimit : option.productStackLimit;
	const size = Math.min(base * multiplier, cap);
	return size > 0 ? size : undefined;
}

/** Exosuit stack, plus the freighter/storage amount when that is larger. */
export function displayedStack(item: StackItem): { exosuit: number; freighter?: number } | undefined {
	const exosuit = inventoryStackSize(item, 'Personal');
	if (exosuit === undefined) return undefined;
	const freighter = inventoryStackSize(item, 'Freighter');
	return freighter !== undefined && freighter !== exosuit ? { exosuit, freighter } : { exosuit };
}
