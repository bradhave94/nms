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
assert(!refiner.includes('Added in update'), 'Category corrections must not get a new-item badge');
assert(!refiner.includes('id="update-changes-panel"'), 'Slug-only changes must not get an update badge');

const added = namedAdditions.find((item) => item.Slug?.startsWith('technology/'));
assert(added, 'Expected a new technology item to verify its detail page');
const addedHtml = await readFile(`dist/${added.Slug}/index.html`, 'utf8');
assert(addedHtml.includes('Added in update'), 'New items must keep their detail-page badge');
assert(!addedHtml.includes('added compared to'), 'The added badge should just state the release');

const changed = update.ChangedItems.find((item) => item.Slug?.startsWith('buildings/')
	&& item.ChangedFields?.includes('BuildableOnSpaceBase'));
assert(changed, 'Expected a changed building to verify its detail page');
const changedHtml = await readFile(`dist/${changed.Slug}/index.html`, 'utf8');
assert(changedHtml.includes('id="update-changes-panel"'), 'Updates must remain on individual pages');
assert(changedHtml.includes('Show what changed'));
assert(changedHtml.includes('Can be built on a space base'));
assert(!changedHtml.includes('Added in update'), 'Updated items must not get a new-item badge');

assert(!namedAdditions.some((item) => item.Id === 'STA_ROOM_DRESS'), 'A product override of an existing room is not a new room');
const variantHtml = await readFile('dist/buildings/STA_ROOM_DRESS/index.html', 'utf8');
assert(!variantHtml.includes('Added in update'));
assert(variantHtml.includes('Orbital-base version of'));
assert(variantHtml.includes('href="/buildings/FRE_ROOM_DRESS"'));
const originalHtml = await readFile('dist/buildings/FRE_ROOM_DRESS/index.html', 'utf8');
assert(originalHtml.includes('Updated in update'));
assert(originalHtml.includes('Can be built on a space base'));
const figurineHtml = await readFile('dist/other/BOBBLE_ASTRO/index.html', 'utf8');
assert(figurineHtml.includes('Added in update 7.00'));

const search = JSON.parse(await readFile('dist/search.json', 'utf8')).body;
const roomResults = search.filter((item) => item.name === 'Appearance Modifier Room');
assert.equal(roomResults.length, 1, 'Search must collapse explicit aliases of the same building');
assert.equal(roomResults[0].id, 'FRE_ROOM_DRESS');
assert(roomResults[0].searchText.includes('STA_ROOM_DRESS'), 'The alias should still find the original building');
assert(!search.some((item) => item.id === 'STA_ROOM_DRESS'));
assert(!search.some((item) => item.id === 'STA_ROOM_NPCVEH'), 'Overrides in other categories must also be collapsed');
assert.equal(search.filter((item) => item.name === 'Atlas Firework Pack').length, 1);
assert(!namedAdditions.some((item) => item.Id.startsWith('TWITCH_FIREW13')));
assert(search.some((item) => item.id === 'U_FR_HYP1'));
assert(search.some((item) => item.id === 'U_FR_HYP4'), 'Different upgrade classes must remain searchable');
assert.notEqual(search.find((item) => item.id === 'U_FR_HYP1').subtitle,
	search.find((item) => item.id === 'U_FR_HYP4').subtitle);

console.warn(`Verified ${namedAdditions.length} new-item cards and structured-data entries, plus existing/new/updated detail pages.`);
