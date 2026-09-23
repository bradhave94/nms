/**
 * Regenerates src/data/galaxies.json from the Fandom wiki's Galaxy page (its numbered
 * "Known positive galaxies" lists). Uses the MediaWiki API, since the HTML pages block
 * scripted requests.
 *
 *   node scripts/fetch-galaxies.mjs
 */
/* global fetch */
import { writeFile, mkdir } from 'node:fs/promises';
import { URL } from 'node:url';

const SOURCE = 'https://nomanssky.fandom.com/wiki/Galaxy';
const API = 'https://nomanssky.fandom.com/api.php?action=parse&page=Galaxy&prop=wikitext&format=json&formatversion=2';
// Reachable galaxies loop from 255 back to Euclid; 256 exists but is closed off.
const LAST_REACHABLE = 255;

const response = await fetch(API, { headers: { 'user-agent': 'nomansskyrecipes.com galaxy list import' } });
if (!response.ok) throw new Error(`Fandom API returned ${response.status}`);
const wikitext = (await response.json()).parse?.wikitext;
if (!wikitext) throw new Error('No wikitext in the Fandom API response');

const galaxies = [];
for (const [, start, items] of wikitext.matchAll(/<ol start="(\d+)"[^>]*>([\s\S]*?)<\/ol>/g)) {
	let number = Number(start);
	for (const [, page, label] of items.matchAll(/<li>\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*<\/li>/g)) {
		galaxies.push({ number: number++, name: (label ?? page).trim() });
	}
}

if (galaxies.length !== 256) throw new Error(`Expected 256 galaxies, parsed ${galaxies.length}`);
galaxies.forEach((galaxy, index) => {
	if (galaxy.number !== index + 1) throw new Error(`Galaxy numbering breaks at ${galaxy.name}`);
});
if (new Set(galaxies.map((galaxy) => galaxy.name.toLowerCase())).size !== galaxies.length) {
	throw new Error('Duplicate galaxy names');
}

const output = {
	source: SOURCE,
	fetched: new Date().toISOString().slice(0, 10),
	galaxies: galaxies.map((galaxy) => ({ ...galaxy, reachable: galaxy.number <= LAST_REACHABLE })),
};
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/galaxies.json', import.meta.url), `${JSON.stringify(output, null, '\t')}\n`);
console.warn(`Wrote ${galaxies.length} galaxies (${galaxies[0].name} to ${galaxies.at(-1).name}).`);
