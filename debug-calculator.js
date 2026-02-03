// Script to manually trace through recipe trees for debugging the calculator
import { readFileSync } from 'fs';

const products = JSON.parse(readFileSync('./src/data/Products.json', 'utf8'));
const raw = JSON.parse(readFileSync('./src/data/RawMaterials.json', 'utf8'));

function getById(id) {
  return products.find(p => p.Id === id) || raw.find(r => r.Id === id);
}

function traceRecipe(item, quantity = 1, depth = 0, rawTotals = {}) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${item.Name} x${quantity} (${item.Id})`);

  if (!item.RequiredItems || item.RequiredItems.length === 0) {
    // This is a raw material
    rawTotals[item.Id] = (rawTotals[item.Id] || 0) + quantity;
    return rawTotals;
  }

  // Process required items
  for (const req of item.RequiredItems) {
    const subItem = getById(req.Id);
    if (subItem) {
      traceRecipe(subItem, req.Quantity * quantity, depth + 1, rawTotals);
    } else {
      console.log(`${indent}  ERROR: Could not find ${req.Id}`);
    }
  }

  return rawTotals;
}

// Get item ID and quantity from command line args
const itemId = process.argv[2] || 'prod79'; // Default to Fusion Ignitor
const quantity = parseInt(process.argv[3]) || 3; // Default to 3

const item = getById(itemId);
if (!item) {
  console.error(`ERROR: Item '${itemId}' not found`);
  process.exit(1);
}

console.log(`=== ${item.Name.toUpperCase()} x${quantity} ===\n`);
const rawTotals = traceRecipe(item, quantity);

console.log('\n=== RAW MATERIALS NEEDED ===');
const sortedRaw = Object.entries(rawTotals).sort((a, b) => {
  const itemA = getById(a[0]);
  const itemB = getById(b[0]);
  return itemA.Name.localeCompare(itemB.Name);
});

for (const [id, qty] of sortedRaw) {
  const rawItem = getById(id);
  console.log(`${rawItem.Name}: ${qty} (${id})`);
}

console.log(`\nTotal unique raw materials: ${sortedRaw.length}`);
