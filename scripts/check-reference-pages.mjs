// /frigate-traits, /settlement-perks, /research-trees and the "How to get" item sections against
// their data: every row is listed, links point at real pages, and pinned examples read the way the
// game data says. Run after the build: pnpm run test:reference-pages
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const DIST = existsSync('dist/client') ? 'dist/client' : 'dist';
const DATA = 'src/datav2';
const read = async (path) => readFile(`${DIST}/${path}/index.html`, 'utf8');
const json = async (name) => JSON.parse(await readFile(`${DATA}/${name}`, 'utf8'));
const rows = (html) => (html.match(/<tr[\s>]/g) ?? []).length;
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

const traits = await json('FrigateTraits.json');
const traitsHtml = await read('frigate-traits');
const traitGroups = new Set(traits.map((trait) => trait.Stat)).size;
assert.equal(rows(traitsHtml), traits.length + traitGroups, 'every frigate trait is listed once (plus one header row per stat)');
assert(text(traitsHtml).includes('Support Specialist -15 Expedition Fuel Cost'), 'fuel traits read as the game shows them');

const perks = await json('SettlementPerks.json');
const perksHtml = await read('settlement-perks');
const perkRows = rows(perksHtml) - (perksHtml.match(/<thead/g) ?? []).length;
assert(perkRows > 0.8 * perks.length && perkRows < perks.length, `settlement perks are listed, identical ones once (${perkRows} of ${perks.length})`);
assert(text(perksHtml).includes('+50,000–100,000 u/day maintenance'), 'settlement effects use the game wording, formatted');
assert(text(perksHtml).includes('citizen happiness') && text(perksHtml).includes('Sentinel attention'), 'settlement stats use the game names');
assert(/Organic/.test(text(traitsHtml)) && /Trade/.test(text(traitsHtml)) && !/DeepSpace|Diplomacy/.test(text(traitsHtml)), 'frigate classes use the game names');
assert(!/%[A-Z_]+%/.test(perksHtml), 'perk name templates are never shown raw');

const research = await json('ResearchTrees.json');
const sources = await json('ItemSources.json');
const blueprintIds = new Set(research.Groups.flatMap((group) => group.Trees.flatMap((tree) => tree.Nodes.map((node) => node.Id))));
const researchHtml = await read('research-trees');
const linked = [...researchHtml.matchAll(/<th scope="row"[\s\S]*?href="([^"]+)"/g)].length;
assert(linked > 1000, `research trees list their blueprints (${linked})`);
assert(!researchHtml.includes('BIG_COK1X2_A') && !text(researchHtml).includes('Corvette Modules'), 'the stale corvette tree (no parts in 7.10) is hidden');
assert(!text(researchHtml).includes('Advaced Construction'), 'the unpriced placeholder tree is hidden');
assert.equal(research.Groups.length, 14);
const stations = [...researchHtml.matchAll(/<h2 class="section-title"[^>]*>([^<]+)/g)].map((match) => match[1].trim());
assert.equal(new Set(stations).size, stations.length, `research station names are unique: ${stations.join(' | ')}`);
const rocketRow = researchHtml.match(/href="\/technology\/SUIT_ROCKET\/?"[\s\S]*?<\/tr>/)?.[0] ?? '';
assert(text(rocketRow).includes('90 Nanites'), 'technology blueprints show the game price (FragmentCost)');

const section = async (path) => text((await read(path)).match(/<section id="how-to-get"[\s\S]*?<\/section>/)?.[0] ?? '');
assert((await section('curiosities/SPOOK_PACKAGE2')).includes('Trade 5 with a forsaken trader for Larva Cannon'), 'items list what they trade for');
assert((await section('other/EXPD_ATLASSTAFF')).includes('Expedition 12: Omega reward, phase 3'), 'expedition rewards use the displayed expedition number');
assert((await section('buildings/STA_62')).includes('Station Decorations, 20 Nanites'), 'blueprints show their tree and price');
assert((await section('other/SPEC_TITLE6')).includes('Quicksilver shop'), 'Quicksilver shop items say so');
assert((await section('technology/SUIT_ROCKET')).includes('90 Nanites'), 'item pages show the blueprint price from the research tree');
assert(!text(await read('technology/SUIT_ROCKET')).includes('Blueprint 1 Nanites'), 'the placeholder tech price is not shown');
assert((await section('other/CHART_TREASURE')).includes('Local Information Repository'), 'exchanges name who offers them with the game names');
for (const [path, expected] of [['technology/SUIT_ROCKET', 'Blueprint 90 Nanites'], ['upgrades/F_HACCESS1', 'Blueprint 4 Salvaged Frigate Module']]) {
	assert(text(await read(path)).includes(expected), `${path}: the blueprint pill shows the research price in its currency (${expected})`);
}
assert((await section('other/EXPD_ODD_EGG')).includes('Nintendo Switch only'), 'Switch-only expedition rewards say so');

// Every "How to get" section: no negative phases, links and anchors resolve.
const anchors = new Set([...researchHtml.matchAll(/<section[^>]* id="([^"]+)"/g)].map((match) => match[1]));
const pages = new Set();
for (const file of ['Buildings.json', 'Technology.json', 'Others.json', 'Products.json', 'Curiosities.json', 'Upgrades.json', 'Corvette.json', 'Food.json', 'RawMaterials.json', 'Exocraft.json', 'Starships.json']) {
	for (const row of await json(file)) if (row.Slug && (sources.Items[row.Id] || blueprintIds.has(row.Id))) pages.add(row.Slug);
}
let checked = 0;
for (const slug of pages) {
	if (!existsSync(`${DIST}/${slug}/index.html`)) continue;
	const html = (await read(slug)).match(/<section id="how-to-get"[\s\S]*?<\/section>/)?.[0] ?? '';
	assert(!/phase -/.test(html), `${slug}: no negative expedition phase`);
	const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => text(match[1]));
	assert.equal(new Set(items).size, items.length, `${slug}: no repeated lines`);
	for (const [, href, hash] of html.matchAll(/href="([^"#]+)(?:#([^"]+))?"/g)) {
		assert(existsSync(`${DIST}${href.replace(/\/?$/, '/')}index.html`), `${slug}: link resolves: ${href}`);
		if (href.startsWith('/research-trees')) assert(anchors.has(hash), `${slug}: research anchor exists: #${hash}`);
	}
	checked += 1;
}
assert(checked > 1500, `checked the How-to-get sections (${checked})`);

for (const html of [traitsHtml, perksHtml, researchHtml]) {
	for (const [, href] of html.matchAll(/href="(\/(?:other|technology|upgrades|products|starships|curiosities|exocraft|corvette|buildings|raw|food|fish)\/[^"#]+)"/g)) {
		assert(existsSync(`${DIST}${href.replace(/\/?$/, '/')}index.html`), `linked item page exists: ${href}`);
	}
}

console.warn(`Verified ${traits.length} frigate traits, ${perks.length} settlement perks, ${linked} research blueprints and item sources.`);
