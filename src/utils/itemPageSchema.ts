import { getById } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import type { JsonLdObject } from '@utils/structuredData';
import { buildPageSignals, getGameId } from '@utils/structuredData';
import type { IOItem, RawItem, RecipeOutput } from '@utils/recipeTree';
import { ensureTrailingSlashUrl } from '@utils/trailingSlash.js';

export type Ingredient = {
  Id: string;
  Name: string;
  Quantity: number;
};

type MethodAction = 'craft' | 'refine' | 'cook';
type Method = {
  action: MethodAction;
  tool: string;
  outputQuantity: number;
  ingredients: Ingredient[];
};

export type FaqQuestion = { question: string; answer: string };

export type ItemPageSchemaInput = {
  item: Item;
  categoryName: string;
  categorySingular: string;
  categoryUrl: string;
  siteOrigin: string;
  canonicalUrl: string;
  itemImageUrl: string;
  isFoodItem: boolean;
  outputRecipes: RecipeOutput[];
  rawItems: RawItem[];
  dataLength: number;
  outputRefinedLength: number;
  outputCookedLength: number;
  dateModified: string;
  /** The page's <title> and meta description, reused for the ItemPage node. */
  pageTitle: string;
  pageDescription: string;
};

export type ItemPageSchemaResult = {
  faqQuestions: FaqQuestion[];
  answerSummary: string;
  structuredData: JsonLdObject[];
  recipeIngredients: Ingredient[];
  recipeToolName: string;
  recipeOutputQuantity: number;
};

const toIngredients = (inputs: IOItem[]): Ingredient[] =>
  inputs.reduce<Ingredient[]>((acc, input) => {
    const ingredient = getById(input.Id);
    if (!ingredient) return acc;
    acc.push({ Id: input.Id, Name: ingredient.Name, Quantity: input.Quantity });
    return acc;
  }, []);

export const buildItemPageSchema = ({
  item,
  categoryName,
  categorySingular,
  categoryUrl: categoryUrlInput,
  siteOrigin,
  canonicalUrl: canonicalUrlInput,
  itemImageUrl,
  isFoodItem,
  outputRecipes,
  rawItems,
  dataLength,
  outputRefinedLength,
  outputCookedLength,
  dateModified,
  pageTitle,
  pageDescription,
}: ItemPageSchemaInput): ItemPageSchemaResult => {
  const canonicalUrl = ensureTrailingSlashUrl(canonicalUrlInput);
  const categoryUrl = ensureTrailingSlashUrl(categoryUrlInput);
  const methods: Method[] = [];
  const craftingIngredients = toIngredients(item.RequiredItems ?? []);
  if (craftingIngredients.length > 0) {
    methods.push({
      action: isFoodItem ? 'cook' : 'craft',
      tool: isFoodItem ? 'Nutrient Processor' : 'Crafting Menu',
      outputQuantity: 1,
      ingredients: craftingIngredients,
    });
  }

  for (const recipe of outputRecipes) {
    if (!recipe.Inputs?.length) continue;
    const ingredients = toIngredients(recipe.Inputs);
    if (ingredients.length === 0) continue;
    const isCookingRecipe = recipe.Slug?.startsWith('nutrient-processor/');
    methods.push({
      action: isCookingRecipe ? 'cook' : 'refine',
      tool: isCookingRecipe ? 'Nutrient Processor' : 'Refiner',
      outputQuantity: recipe.Output?.Quantity ?? 1,
      ingredients,
    });
  }

  const seenMethodKeys = new Set<string>();
  const uniqueMethods = methods.filter((method) => {
    const ingredientSignature = method.ingredients
      .map((ingredient) => `${ingredient.Id}:${ingredient.Quantity}`)
      .join('|');
    const methodKey = `${method.action}:${method.tool}:${method.outputQuantity}:${ingredientSignature}`;
    if (seenMethodKeys.has(methodKey)) return false;
    seenMethodKeys.add(methodKey);
    return true;
  });

  const breadcrumbSchema: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: categoryUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: item.Name,
        item: canonicalUrl,
      },
    ],
  };
  // The in-game item. Plain Thing: crafting and refining are not food recipes, so no Recipe/HowTo markup.
  const itemEntity: JsonLdObject = {
    '@type': 'Thing',
    '@id': `${canonicalUrl}#item`,
    identifier: item.Id,
    name: item.Name,
    ...(item.Description ? { description: item.Description } : {}),
    image: itemImageUrl,
    url: canonicalUrl,
  };
  const itemPageSchema: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: pageTitle,
    description: pageDescription,
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
    ...buildPageSignals({ siteOrigin, dateModified }),
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: itemImageUrl,
    },
    about: [itemEntity, { '@id': getGameId(siteOrigin) }],
    mainEntity: { '@id': `${canonicalUrl}#item` },
  };

  // Answer-first summary and the visible FAQ (ItemFaq.astro renders the same questions).
  // The crafting recipe when there is one, else the machine recipe with the best yield per input
  // unit (the same one the page's "Best yield" box shows), not whichever recipe the data lists first.
  const yieldPerInput = (method: Method) => {
    const units = method.ingredients.reduce((sum, ingredient) => sum + ingredient.Quantity, 0);
    return units > 0 ? method.outputQuantity / units : 0;
  };
  const primaryMethod =
    uniqueMethods.find((method) => method.action === 'craft') ??
    [...uniqueMethods].sort((a, b) => yieldPerInput(b) - yieldPerInput(a) || b.outputQuantity - a.outputQuantity)[0];
  const ingredientList =
    primaryMethod?.ingredients.map((i) => `${i.Name} x${i.Quantity}`).join(', ') ??
    rawItems.map((r) => `${r.Name} x${r.Quantity}`).join(', ');
  const toolName = primaryMethod?.tool ?? (isFoodItem ? 'Nutrient Processor' : 'Refiner');
  // "Raw Materials" is the site's catalog, not what the item is: Chromatic Metal is a refined alloy.
  // Name raw materials by their in-game group instead ("a highly refined stellar metal").
  const group = typeof item.Group === 'string' ? item.Group.trim() : '';
  const kind =
    categorySingular === 'raw material' && group && !/[%{}]|-null-/i.test(group) ? group.toLowerCase() : categorySingular;
  const lead = `${item.Name} is ${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind} in No Man's Sky.`;
  const refinerSize = (count: number) => (count >= 3 ? 'Large Refiner' : count === 2 ? 'Medium Refiner' : 'Portable Refiner');
  const outputNote = (method: Method) => (method.outputQuantity > 1 ? ` to get ${method.outputQuantity}` : '');
  const howTo = !primaryMethod
    ? ''
    : primaryMethod.action === 'refine'
      ? ` The best yield: refine ${ingredientList} in a ${refinerSize(primaryMethod.ingredients.length)}${outputNote(primaryMethod)}.`
      : primaryMethod.action === 'cook'
        ? ` To cook it, combine ${ingredientList} in a Nutrient Processor${outputNote(primaryMethod)}.`
        : ` To craft it, combine ${ingredientList}${isFoodItem ? ' in a Nutrient Processor' : ''}.`;
  // The in-game description is shown in its own "About" block, so the summary doesn't repeat it.
  const answerSummary = `${lead}${howTo}`;

  const faqQuestions: FaqQuestion[] = [];
  if (dataLength > 0 || outputRefinedLength > 0 || outputCookedLength > 0) {
    faqQuestions.push({
      question: `How do I craft ${item.Name} in No Man's Sky?`,
      answer: `To craft ${item.Name}, you need ${ingredientList}. Use the ${toolName} to combine them.`,
    });
    faqQuestions.push({
      question: `What ingredients do I need for ${item.Name}?`,
      answer: `You need: ${ingredientList}.`,
    });
  } else {
    faqQuestions.push({
      question: `What is ${item.Name} in No Man's Sky?`,
      answer: item.Description ? `${item.Description}` : `${item.Name} is a ${categoryName.toLowerCase()} item in No Man's Sky.`,
    });
  }
  const faqSchema: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqQuestions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  // Inputs for the visible "Recipe Steps" panel on food pages (ItemDetails.astro)
  const recipeIngredients = craftingIngredients.length > 0
    ? craftingIngredients
    : uniqueMethods.find((m) => m.action === 'cook')?.ingredients ?? [];
  const cookingRecipeMethod = uniqueMethods.find((method) => method.action === 'cook');
  const recipeSourceMethod = cookingRecipeMethod ?? uniqueMethods[0];
  const recipeOutputQuantity = recipeSourceMethod?.outputQuantity ?? 1;
  const recipeToolName = recipeSourceMethod?.tool ?? 'Nutrient Processor';

  return {
    faqQuestions,
    answerSummary,
    structuredData: [breadcrumbSchema, itemPageSchema, faqSchema],
    recipeIngredients,
    recipeToolName,
    recipeOutputQuantity,
  };
};
