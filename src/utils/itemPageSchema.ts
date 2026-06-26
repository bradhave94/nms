import { getById } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import type { JsonLdObject } from '@utils/structuredData';
import { buildPageSignals, serializeJsonLdGraph } from '@utils/structuredData';
import { SITE } from '@config';
import type { IOItem, RawItem, RecipeOutput } from '@utils/recipeTree';

export type HowToIngredient = {
  Id: string;
  Name: string;
  Quantity: number;
};

type HowToMethodAction = 'craft' | 'refine' | 'cook';
type HowToMethod = {
  action: HowToMethodAction;
  tool: string;
  outputQuantity: number;
  ingredients: HowToIngredient[];
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
};

export type ItemPageSchemaResult = {
  faqQuestions: FaqQuestion[];
  answerSummary: string;
  itemPageStructuredDataJson: string;
  recipeIngredients: HowToIngredient[];
  recipeToolName: string;
  recipeOutputQuantity: number;
};

const toHowToIngredients = (inputs: IOItem[]): HowToIngredient[] =>
  inputs.reduce<HowToIngredient[]>((acc, input) => {
    const ingredient = getById(input.Id);
    if (!ingredient) return acc;
    acc.push({ Id: input.Id, Name: ingredient.Name, Quantity: input.Quantity });
    return acc;
  }, []);

export const buildItemPageSchema = ({
  item,
  categoryName,
  categorySingular,
  categoryUrl,
  siteOrigin,
  canonicalUrl,
  itemImageUrl,
  isFoodItem,
  outputRecipes,
  rawItems,
  dataLength,
  outputRefinedLength,
  outputCookedLength,
}: ItemPageSchemaInput): ItemPageSchemaResult => {
  const howToMethods: HowToMethod[] = [];
  const craftingHowToIngredients = toHowToIngredients(item.RequiredItems ?? []);
  if (craftingHowToIngredients.length > 0) {
    howToMethods.push({
      action: isFoodItem ? 'cook' : 'craft',
      tool: isFoodItem ? 'Nutrient Processor' : 'Crafting Menu',
      outputQuantity: 1,
      ingredients: craftingHowToIngredients,
    });
  }

  for (const recipe of outputRecipes) {
    if (!recipe.Inputs?.length) continue;
    const ingredients = toHowToIngredients(recipe.Inputs);
    if (ingredients.length === 0) continue;
    const isCookingRecipe = recipe.Slug?.startsWith('nutrient-processor/');
    howToMethods.push({
      action: isCookingRecipe ? 'cook' : 'refine',
      tool: isCookingRecipe ? 'Nutrient Processor' : 'Refiner',
      outputQuantity: recipe.Output?.Quantity ?? 1,
      ingredients,
    });
  }

  const seenHowToMethodKeys = new Set<string>();
  const uniqueHowToMethods = howToMethods.filter((method) => {
    const ingredientSignature = method.ingredients
      .map((ingredient) => `${ingredient.Id}:${ingredient.Quantity}`)
      .join('|');
    const methodKey = `${method.action}:${method.tool}:${method.outputQuantity}:${ingredientSignature}`;
    if (seenHowToMethodKeys.has(methodKey)) return false;
    seenHowToMethodKeys.add(methodKey);
    return true;
  });

  const limitedHowToMethods = uniqueHowToMethods.slice(0, 5);
  const seenHowToNames = new Set<string>();
  const howToEntries = limitedHowToMethods.map((method, methodIndex) => {
    const ingredientText = method.ingredients.map((ingredient) => `${ingredient.Name} x${ingredient.Quantity}`).join(', ');
    const mainIngredient = method.ingredients[0]?.Name ?? item.Name;
    const actionLabel = method.action.charAt(0).toUpperCase() + method.action.slice(1);
    let howToName = `How to ${method.action} ${item.Name} from ${mainIngredient}`;
    if (seenHowToNames.has(howToName)) {
      howToName = `${howToName} (Method ${methodIndex + 1})`;
    }
    seenHowToNames.add(howToName);

    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: howToName,
      description: `Learn how to ${method.action} ${item.Name} in No Man's Sky`,
      step: [
        {
          '@type': 'HowToStep',
          name: 'Gather materials',
          text: `Collect ${ingredientText}.`,
        },
        {
          '@type': 'HowToStep',
          name: `${actionLabel} the item`,
          text: `Use ${method.tool} to ${method.action} ${item.Name} from ${ingredientText}${method.outputQuantity > 1 ? ` to produce x${method.outputQuantity}.` : '.'}`,
        },
      ],
      supply: method.ingredients.map((ingredient) => ({
        '@type': 'HowToSupply',
        name: ingredient.Name,
      })),
      tool: [
        {
          '@type': 'HowToTool',
          name: method.tool,
        },
      ],
    };
  });

  const howToSchema =
    howToEntries.length === 0
      ? undefined
      : howToEntries.length === 1
        ? howToEntries[0]
        : howToEntries;
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
  const itemPageSchema: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${item.Name} | No Man's Sky Recipes`,
    description: item.Description,
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
    ...buildPageSignals({ siteOrigin, dateModified: SITE.version_date }),
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: itemImageUrl,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.item-summary'],
    },
    mainEntity: {
      '@type': 'Thing',
      '@id': `${canonicalUrl}#item`,
      identifier: item.Id,
      name: item.Name,
      description: item.Description,
      image: itemImageUrl,
      url: canonicalUrl,
    },
  };

  // AEO: Answer-first summary, FAQ schema, Recipe schema
  const primaryMethod = uniqueHowToMethods[0];
  const ingredientList =
    primaryMethod?.ingredients.map((i) => `${i.Name} x${i.Quantity}`).join(', ') ??
    rawItems.map((r) => `${r.Name} x${r.Quantity}`).join(', ');
  const toolName = primaryMethod?.tool ?? (isFoodItem ? 'Nutrient Processor' : 'Refiner');
  const answerSummary =
    dataLength > 0 || outputRefinedLength > 0 || outputCookedLength > 0
      ? item.Description
        ? `${item.Name} is a ${categorySingular} in No Man's Sky. ${(item.Description as string).trim()} To craft it, combine ${ingredientList} in a ${toolName}.`
        : `${item.Name} is a ${categorySingular} in No Man's Sky. To craft it, combine ${ingredientList} in a ${toolName}.`
      : item.Description
        ? `${item.Name} is a ${categorySingular} in No Man's Sky. ${item.Description}`
        : `${item.Name} is a ${categorySingular} in No Man's Sky.`;

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

  let recipeSchema: JsonLdObject | undefined;
  const recipeIngredients = craftingHowToIngredients.length > 0
    ? craftingHowToIngredients
    : uniqueHowToMethods.find((m) => m.action === 'cook')?.ingredients ?? [];
  const cookingRecipeMethod = uniqueHowToMethods.find((method) => method.action === 'cook');
  const recipeSourceMethod = cookingRecipeMethod ?? uniqueHowToMethods[0];
  const recipeOutputQuantity = recipeSourceMethod?.outputQuantity ?? 1;
  const recipeToolName = recipeSourceMethod?.tool ?? 'Nutrient Processor';
  const recipePrepMinutes = Math.max(1, Math.min(30, recipeIngredients.length * 2));
  const recipeCookMinutes = Math.max(1, Math.min(15, Math.ceil(recipeIngredients.length / 2)));
  const recipeKeywords = Array.from(
    new Set(
      [
        "No Man's Sky",
        "No Man's Sky recipes",
        'Nutrient Processor',
        item.Name,
        item.Group,
        categoryName,
      ].filter((keyword): keyword is string => Boolean(keyword))
    )
  ).join(', ');
  if (isFoodItem && recipeIngredients.length > 0) {
    const ingredientSentence = recipeIngredients.map((ingredient) => `${ingredient.Name} (x${ingredient.Quantity})`).join(', ');
    recipeSchema = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: item.Name,
      description: item.Description ?? `How to cook ${item.Name} in No Man's Sky`,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      image: itemImageUrl,
      author: {
        '@id': `${siteOrigin}#organization`,
      },
      recipeCategory: item.Group || 'Food',
      recipeCuisine: "No Man's Sky",
      keywords: recipeKeywords,
      prepTime: `PT${recipePrepMinutes}M`,
      cookTime: `PT${recipeCookMinutes}M`,
      totalTime: `PT${recipePrepMinutes + recipeCookMinutes}M`,
      nutrition: {
        '@type': 'NutritionInformation',
        servingSize: `${recipeOutputQuantity} in-game item${recipeOutputQuantity > 1 ? 's' : ''}`,
      },
      recipeIngredient: recipeIngredients.map((i) => `${i.Name} x${i.Quantity}`),
      recipeInstructions: [
        {
          '@type': 'HowToStep',
          name: 'Gather ingredients',
          text: `Gather ${ingredientSentence}.`,
          url: `${canonicalUrl}#recipe-step-1`,
          image: itemImageUrl,
        },
        {
          '@type': 'HowToStep',
          name: `Cook in ${recipeToolName}`,
          text: `Combine the ingredients in ${recipeToolName} to cook ${item.Name}${recipeOutputQuantity > 1 ? ` (x${recipeOutputQuantity}).` : '.'}`,
          url: `${canonicalUrl}#recipe-step-2`,
          image: itemImageUrl,
        },
      ],
      recipeYield: recipeOutputQuantity.toString(),
    };
  }

  const itemPageStructuredData: JsonLdObject[] = [breadcrumbSchema, itemPageSchema, faqSchema];
  if (howToSchema) {
    if (Array.isArray(howToSchema)) {
      itemPageStructuredData.push(...howToSchema);
    } else {
      itemPageStructuredData.push(howToSchema);
    }
  }
  if (recipeSchema) {
    itemPageStructuredData.push(recipeSchema);
  }
  const itemPageStructuredDataJson = serializeJsonLdGraph(itemPageStructuredData);

  return {
    faqQuestions,
    answerSummary,
    itemPageStructuredDataJson,
    recipeIngredients,
    recipeToolName,
    recipeOutputQuantity,
  };
};
