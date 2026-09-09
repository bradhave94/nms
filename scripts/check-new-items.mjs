import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const update = JSON.parse(await readFile('src/datav2/new.json', 'utf8'));
const namedAdditions = update.Items.filter((item) => item.Name?.trim());
const html = await readFile('dist/new/index.html', 'utf8');
assert(!html.includes('id="items-changed"'), '/new must not list updated items');
assert(!html.includes('Removed from data'), '/new must not list removals');
assert(!html.includes('/technology/SUIT_REFINER"'), 'Personal Refiner is an existing item');
assert.equal((html.match(/<article\b/g) ?? []).length, namedAdditions.length);

const documents = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
	.flatMap((match) => JSON.parse(match[1]))
	.flatMap((doc) => doc['@graph'] ?? [doc]);
const collection = documents.find((doc) => doc['@type'] === 'CollectionPage');
assert(collection, 'The new-items collection must have structured data');
assert.equal(collection.mainEntity.numberOfItems, namedAdditions.length);
assert.deepEqual(
	collection.mainEntity.itemListElement.map((item) => item.name).sort(),
	namedAdditions.map((item) => item.Name).sort(),
);

const refiner = await readFile('dist/technology/SUIT_REFINER/index.html', 'utf8');
assert(!refiner.includes('New in update'), 'Category corrections must not get a new-item badge');
assert(!refiner.includes('id="update-changes-panel"'), 'Slug-only changes must not get an update badge');

const added = namedAdditions.find((item) => item.Slug?.startsWith('technology/'));
assert(added, 'Expected a new technology item to verify its detail page');
const addedHtml = await readFile(`dist/${added.Slug}/index.html`, 'utf8');
assert(addedHtml.includes('New in update'), 'New items must keep their detail-page badge');

const changed = update.ChangedItems.find((item) => item.Slug?.startsWith('buildings/')
	&& item.ChangedFields?.includes('BuildableOnSpaceBase'));
assert(changed, 'Expected a changed building to verify its detail page');
const changedHtml = await readFile(`dist/${changed.Slug}/index.html`, 'utf8');
assert(changedHtml.includes('id="update-changes-panel"'), 'Updates must remain on individual pages');
assert(changedHtml.includes('Show what changed'));
assert(changedHtml.includes('Can be built on a space base'));
assert(!changedHtml.includes('New in update'), 'Updated items must not get a new-item badge');

console.warn(`Verified ${namedAdditions.length} new-item cards and structured-data entries, plus existing/new/updated detail pages.`);
