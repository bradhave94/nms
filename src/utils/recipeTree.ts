import { getById } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';

export type ProcessedItem = {
  Id: string;
  fishId?: string;
  Name: string;
  Icon: string;
  Colour: string;
  Quantity: number;
  RequiredItems: ProcessedItem[];
};

export type RawItem = {
  Id: string;
  Name: string;
  Icon: string;
  Colour?: string;
  Group?: string;
  Quantity: number;
};

export type IOItem = { Id: string; Quantity: number };
export type RecipeOutput = { Id?: string; Slug?: string; Operation?: string; Time?: string; Output?: IOItem; Inputs?: IOItem[] };
export type RecipeInput = { Output?: IOItem; Inputs?: IOItem[] };
export type UsedInItem = {
  Id: string;
  Icon: string;
  Name: string;
  Quantity: number;
  RequiredItems: RawItem[];
  Operation?: string;
  Time?: string;
};
export type RecipeRow = { inputs: RawItem[]; outputQuantity: number };
export type GroupedUsedIn = UsedInItem & { recipes: RecipeRow[] };

// Function to create an array of required items
export const createArray = (
  item: Item,
  num = 1,
  visited = new Set<string>()
): { array: ProcessedItem[]; rawItems: RawItem[] } => {
  // Prevent infinite recursion
  if (visited.has(item.Id)) {
    return { array: [], rawItems: [] };
  }
  visited.add(item.Id);

  const array: ProcessedItem[] = [];
  const rawItemsMap = new Map<string, RawItem>();

  const collectRawItems = (item: Item, multiplier = 1, itemVisited = new Set<string>()) => {
    if (!item.RequiredItems?.length) {
      // This is a raw item - always count it, don't add to visited
      const key = item.Id;
      if (rawItemsMap.has(key)) {
        const existingItem = rawItemsMap.get(key);
        if (!existingItem) return;
        existingItem.Quantity += multiplier;
      } else {
        rawItemsMap.set(key, {
          Id: item.Id,
          Name: item.Name,
          Icon: item.Icon,
          Colour: item.Colour,
          Group: item.Group,
          Quantity: multiplier,
        });
      }
      return;
    }

    // For non-raw items, prevent infinite recursion
    if (itemVisited.has(item.Id)) {
      return;
    }
    itemVisited.add(item.Id);

    // Recursively collect raw items from children
    for (const reqItem of item.RequiredItems) {
      const itemData = getById(reqItem.Id);
      if (!itemData) continue;
      collectRawItems(itemData, reqItem.Quantity * multiplier, itemVisited);
    }
  };

  // First pass: collect raw items
  for (const requiredItem of item.RequiredItems || []) {
    const itemData = getById(requiredItem.Id);
    if (!itemData) continue;
    collectRawItems(itemData, requiredItem.Quantity * num);
  }

  // Second pass: build the tree structure
  for (const requiredItem of item.RequiredItems || []) {
    const itemData = getById(requiredItem.Id);
    if (!itemData) continue;

    array.push({
      Id: itemData.Id,
      Name: itemData.Name,
      Icon: itemData.Icon,
      Colour: itemData.Colour,
      Quantity: requiredItem.Quantity,
      RequiredItems: itemData.RequiredItems?.length
        ? createArray(itemData, requiredItem.Quantity, new Set([...visited])).array.map(i => ({...i}))
        : [],
    });
  }

  return {
    array,
    rawItems: Array.from(rawItemsMap.values())
  };
};

// Function to get output items
export const getOutputs = (item: Item, recipe: RecipeOutput): UsedInItem | undefined => {
  if (!recipe.Inputs?.length) return undefined;
  const RequiredItems: RawItem[] = [];
  for (const element of recipe.Inputs) {
    const i = getById(element.Id);
    if (!i) continue;
    RequiredItems.push({
      Id: i.Id,
      Icon: i.Icon,
      Name: i.Name,
      Group: i.Group,
      Quantity: element.Quantity,
    });
  }

  return {
    Id: item.Id,
    Icon: item.Icon,
    Name: item.Name,
    Quantity: recipe.Output?.Quantity ?? 1,
    RequiredItems: RequiredItems,
  };
};

// Function to get input items
export const getInputs = (item: RecipeInput[]): UsedInItem[] => {
  const results: UsedInItem[] = [];
  for (const recipe of item) {
    if (!recipe.Output || !recipe.Inputs) continue;
    const outputItem = getById(recipe.Output.Id);
    if (!outputItem) continue;
    const requiredItems: RawItem[] = [];
    for (const input of recipe.Inputs) {
      const inputItem = getById(input.Id);
      if (!inputItem) continue;
      requiredItems.push({
        Id: inputItem.Id,
        Icon: inputItem.Icon,
        Name: inputItem.Name,
        Group: inputItem.Group,
        Quantity: input.Quantity
      });
    }

    results.push({
      Id: recipe.Output.Id,
      Icon: outputItem.Icon,
      Name: outputItem.Name,
      Quantity: recipe.Output.Quantity,
      RequiredItems: requiredItems
    });
  }
  return results;
};

export const groupByOutput = (inputData: RecipeInput[]) => {
  const inputRaw = getInputs(inputData);
  return Object.values(
    inputRaw.reduce<Record<string, GroupedUsedIn>>((acc, usedIn) => {
      const key = usedIn.Id;
      if (!acc[key]) {
        acc[key] = { ...usedIn, recipes: [] };
      }
      if (usedIn.RequiredItems.length > 0) {
        acc[key].recipes.push({ inputs: usedIn.RequiredItems, outputQuantity: usedIn.Quantity });
      }
      return acc;
    }, {})
  ).filter((g) => g.recipes.length > 0);
};
