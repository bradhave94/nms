import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
// names on the page go through the same cleanup as every page (src/integrations/cleanGameNames.ts)
import { cleanName } from '../src/integrations/cleanGameNames.ts';
import { isSupportedItemRoute } from '../src/utils/routeEligible.ts';

// The Cloudflare adapter writes prerendered pages to dist/client.
const DIST = existsSync('dist/client') ? 'dist/client' : 'dist';

const update = JSON.parse(await readFile('src/datav2/new.json', 'utf8'));
// Only additions with a route get a card: arena modes, AI configs, reward tables and titles
// don't. Pet-shop eggs link to their row on the arena page.
const route = (item) => (item.Slug?.startsWith('creatures/shop/') ? `/creatures/arena#pet-shop-${item.Id}` : `/${item.Slug}`);
const namedAdditions = update.Items.filter((item) => item.Name?.trim() && item.Slug && isSupportedItemRoute(route(item)));
for (const item of namedAdditions) {
	const path = route(item).split('#')[0];
	assert(existsSync(`${DIST}${path}/index.html`), `new item ${item.Id} must have a built page at ${path}`);
}
const html = await readFile(`${DIST}/new/index.html`, 'utf8');
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
	namedAdditions.map((item) => cleanName(item.Name)).sort(),
);

const refiner = await readFile(`${DIST}/technology/SUIT_REFINER/index.html`, 'utf8');
assert(!/Added in \d/.test(refiner), 'Category corrections must not get a new-item badge');
assert(!refiner.includes('id="update-changes-panel"'), 'Slug-only changes must not get an update badge');

const added = namedAdditions[0];
assert(added, 'Expected a new item to verify its detail page');
const addedHtml = await readFile(`${DIST}/${added.Slug}/index.html`, 'utf8');
assert(/Added in \d/.test(addedHtml), 'New items must keep their detail-page badge');
assert(!addedHtml.includes('added compared to'), 'The added badge should just state the release');

const changed = update.ChangedItems.find((item) => item.Slug?.startsWith('buildings/')
	&& item.ChangedFields?.includes('BuildableOnSpaceBase'))
	?? update.ChangedItems.find((item) => existsSync(`${DIST}/${item.Slug}/index.html`));
assert(changed, 'Expected a changed item to verify its detail page');
const changedHtml = await readFile(`${DIST}/${changed.Slug}/index.html`, 'utf8');
assert(changedHtml.includes('id="update-changes-panel"'), 'Updates must remain on individual pages');
assert(changedHtml.includes('Show what changed'));
if (changed.ChangedFields?.includes('BuildableOnSpaceBase')) assert(changedHtml.includes('Can be built on a space base'));
assert(!/Added in \d/.test(changedHtml), 'Updated items must not get a new-item badge');

assert(!namedAdditions.some((item) => item.Id === 'STA_ROOM_DRESS'), 'A product override of an existing room is not a new room');
const variantHtml = await readFile(`${DIST}/buildings/STA_ROOM_DRESS/index.html`, 'utf8');
assert(!/Added in \d/.test(variantHtml));
assert(variantHtml.includes('Orbital-base version of'));
// The post-build trailing-slash step rewrites internal links to end in /.
assert(/href="\/buildings\/FRE_ROOM_DRESS\/?"/.test(variantHtml));
// Expedition variants of existing items stay in the list, labelled on /new, their pages and search.
const variants = namedAdditions.filter((item) => item.ReleaseVariant?.Kind === 'expedition');
for (const variant of variants) {
	const detail = await readFile(`${DIST}/${variant.Slug}/index.html`, 'utf8');
	assert(detail.includes(`Expedition ${variant.ReleaseVariant.Expedition} variant`));
}
assert.equal((html.match(/Expedition \d+ variant/g) ?? []).length, variants.length);

const search = JSON.parse(await readFile(`${DIST}/search.json`, 'utf8')).body;
const diplo = search.find((item) => item.id === 'DIPLO_PET');
assert(diplo, 'Nested species must be included in search');
assert.equal(diplo.url, '/creatures/DIPLO_PET');
assert((await readFile(`${DIST}/creatures/DIPLO_PET/index.html`, 'utf8')).includes(diplo.icon),
	'Creature detail pages must use the species icon fallback');
const roomResults = search.filter((item) => item.name === 'Appearance Modifier Room');
assert.equal(roomResults.length, 1, 'Search must collapse explicit aliases of the same building');
assert.equal(roomResults[0].id, 'FRE_ROOM_DRESS');
assert(roomResults[0].searchText.includes('STA_ROOM_DRESS'), 'The alias should still find the original building');
assert(!search.some((item) => item.id === 'STA_ROOM_DRESS'));
assert(!search.some((item) => item.id === 'STA_ROOM_NPCVEH'), 'Overrides in other categories must also be collapsed');
for (const variant of variants) {
	assert.equal(search.find((item) => item.id === variant.Id)?.subtitle, `Expedition ${variant.ReleaseVariant.Expedition} variant`);
}
assert(search.some((item) => item.id === 'MYSTERY_BEACON'));
assert.equal(search.filter((item) => item.name === 'Atlas Firework Pack').length, 1);
assert(!namedAdditions.some((item) => item.Id.startsWith('TWITCH_FIREW13')));
assert(search.some((item) => item.id === 'U_FR_HYP1'));
assert(search.some((item) => item.id === 'U_FR_HYP4'), 'Different upgrade classes must remain searchable');
assert.notEqual(search.find((item) => item.id === 'U_FR_HYP1').subtitle,
	search.find((item) => item.id === 'U_FR_HYP4').subtitle);

console.warn(`Verified ${namedAdditions.length} new-item cards and structured-data entries, plus existing/new/updated detail pages.`);
