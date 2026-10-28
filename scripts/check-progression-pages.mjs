// /expeditions, /milestones, /inventory-slots and /trading against their data: expectations are
// built from the JSON (every reward under its phase, every table row, the trade loops), pinned
// values read the way the game data says, and every link and #anchor resolves.
// Run after the build: pnpm run test:progression-pages
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const DIST = existsSync('dist/client') ? 'dist/client' : 'dist';
const pages = new Map();
const read = async (path) => {
	if (!pages.has(path)) pages.set(path, await readFile(`${DIST}/${path}/index.html`, 'utf8'));
	return pages.get(path);
};
const json = async (name) => JSON.parse(await readFile(`src/datav2/${name}`, 'utf8'));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const sectionOf = (html, id) => html.match(new RegExp(`<section[^>]* id="${id}"[\\s\\S]*?</section>`))?.[0] ?? '';
const tableRows = (html) => [...(html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => text(match[1]));
const ladderTable = (html, id) => html.match(new RegExp(`<div id="${id}"[^>]*>[\\s\\S]*?</table>`))?.[0] ?? '';
const anchor = (id) => id.toLowerCase().replace(/_/g, '-');
const fmt = (value) => value.toLocaleString('en-US');
const grades = ['C', 'B', 'A', 'S'];

// ---------- expeditions: every reward link under its phase heading ----------
const sources = await json('ItemSources.json');
const expeditionsHtml = await read('expeditions');
const shown = sources.Expeditions.filter((row) => row.Remix === 0);
assert.equal((expeditionsHtml.match(/<section[^>]* id="expedition-/g) ?? []).length, shown.length, 'each expedition is listed once');
const linksByHeading = (html) => {
	const result = new Map();
	for (const part of html.split(/<h3[^>]*>/).slice(1)) {
		const heading = text(part.slice(0, part.indexOf('</h3>')));
		result.set(heading, new Set([...part.matchAll(/href="\/[a-z-]+\/([^/"#]+)\/?"/g)].map((match) => match[1])));
	}
	return result;
};
// Which rewards should be listed comes from the data, not the page: every item with a built page.
const builtPages = new Set();
for (const file of ['Buildings.json', 'ConstructedTechnology.json', 'Corvette.json', 'Curiosities.json', 'Exocraft.json', 'Fish.json',
	'Food.json', 'Others.json', 'Products.json', 'RawMaterials.json', 'Starships.json', 'Technology.json', 'TechnologyModule.json',
	'Trade.json', 'Upgrades.json']) {
	for (const row of await json(file)) if (row.Slug && existsSync(`${DIST}/${row.Slug}/index.html`)) builtPages.add(row.Id);
}
let checkedRewards = 0;
for (const row of shown) {
	const headings = linksByHeading(sectionOf(expeditionsHtml, `expedition-${row.DisplayNumber}`));
	for (const [id, list] of Object.entries(sources.Items)) {
		if (!builtPages.has(id)) continue; // items without a page aren't listed
		for (const source of list.filter((entry) => entry.Type === 'Expedition' && entry.Expeditions.includes(row.DisplayNumber))) {
			const wanted = source.Phases.filter((phase) => phase > 0);
			for (const heading of wanted.length ? wanted.map((phase) => `Phase ${phase}`) : ['Other rewards']) {
				assert(headings.get(heading)?.has(id), `expedition ${row.DisplayNumber}: ${id} listed under "${heading}"`);
				checkedRewards += 1;
			}
		}
	}
}
assert(checkedRewards > 250, `checked expedition rewards by phase (${checkedRewards})`);
assert(!/Phase -|Phase 0/.test(text(expeditionsHtml)), 'no negative or zero phases');
assert((await read('other/EXPD_ATLASSTAFF')).includes('href="/expeditions/#expedition-12"'), 'item expedition lines link to the expedition');

// ---------- milestones ----------
const milestones = await json('Milestones.json');
const milestonesHtml = await read('milestones');
assert.deepEqual(tableRows(sectionOf(milestonesHtml, 'journey')), milestones.Journey.map((rank) => `${rank.Name} ${rank.Points}`), 'every Journey rank and its points');
for (const ladder of milestones.Ladders.filter((entry) => entry.ShowInTerminal && entry.Title)) {
	const unit = ladder.Id === 'DIST_WALKED' ? 'u' : '';
	assert.deepEqual(tableRows(ladderTable(milestonesHtml, anchor(ladder.Id))), ladder.Levels.map((level) => `${level.Name} ${fmt(level.Value)}${unit}`), `milestone ladder ${ladder.Id}`);
}
const standing = { TRA_STANDING: 'Gek', EXP_STANDING: 'Korvax', WAR_STANDING: "Vy'keen", BUI_STANDING: 'Autophage',
	TGUILD_STAND: 'Merchants Guild', EGUILD_STAND: 'Explorers Guild', WGUILD_STAND: 'Mercenaries Guild', PIRATE_STAND: 'Outlaws' };
for (const [id, name] of Object.entries(standing)) {
	const html = ladderTable(milestonesHtml, anchor(id));
	assert.equal(text(html.match(/<h3[^>]*>[\s\S]*?<\/h3>/)?.[0] ?? ''), name, `standing ladder ${id} is named ${name}`);
	const ladder = milestones.Ladders.find((entry) => entry.Id === id);
	assert.deepEqual(tableRows(html), ladder.Levels.map((level) => `${level.Name} ${fmt(level.Value)}`), `standing ladder ${id} ranks`);
}
assert(text(milestonesHtml).includes('Discovered all species on … planets'), 'ladders say what they count, in the game words');
assert(text(milestonesHtml).includes('shown in sols'), 'the survival ladder notes its values are stored, not sols');

// ---------- inventory slots ----------
const inventory = await json('Inventory.json');
const inventoryHtml = await read('inventory-slots');
const expectedShips = Object.entries(inventory.MaxSlots)
	.filter(([type, slots]) => grades.some((grade) => slots.General[grade] > 0) && inventory.Labels.Ships[type])
	.map(([type, slots]) => `${inventory.Labels.Ships[type]} ${grades.map((grade) => `${slots.General[grade]} / ${slots.Tech[grade]}`).join(' ')}`);
assert.deepEqual(tableRows(sectionOf(inventoryHtml, 'starships')), expectedShips, 'every named ship type and its max slots by class');
assert.deepEqual(tableRows(sectionOf(inventoryHtml, 'multi-tool')), [`Any type ${grades.map((grade) => inventory.MultiToolMaxSlots[grade]).join(' ')}`]);
const fullOdds = Object.entries(inventory.ClassOdds).filter(([, odds]) => Math.abs(grades.reduce((sum, grade) => sum + odds[grade], 0) - 100) < 0.01);
assert.deepEqual(tableRows(sectionOf(inventoryHtml, 'class-odds')), fullOdds.map(([wealth, odds]) => `${wealth} system ${grades.map((grade) => `${odds[grade]}%`).join(' ')}`),
	'class odds rows that are full distributions');
assert(!/Atlantid \(|Freighter/.test(text(inventoryHtml)), 'types the game does not name are left out');
const fighterDamage = inventory.BaseStats.Ships.Fighter.S.find((entry) => entry.Stat === 'SHIP_DAMAGE');
const fighterTable = text(inventoryHtml.match(/Fighter<\/h4>[\s\S]*?<\/table>/)?.[0] ?? '');
assert(fighterTable.includes('Damage') && fighterTable.includes(`${fighterDamage.Min}–${fighterDamage.Max}`), 'base stat tables show the class ranges');

// ---------- trading ----------
const trading = await json('Trading.json');
const tradingHtml = await read('trading');
const category = (id) => trading.Categories[id].Name.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
assert.deepEqual(tableRows(sectionOf(tradingHtml, 'economies')), trading.Economies.map((economy) =>
	`${economy.Names[0]} ${economy.Names.slice(1).join(', ')} ${category(economy.Sells)} ${category(economy.Needs)}`), 'every economy, its game names and trade');
const loops = [...(tradingHtml.match(/<ol class="tr-loops"[\s\S]*?<\/ol>/)?.[0] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
	.map((match) => text(match[1].replace(/<span class="sr-only"[^>]*>[^<]*<\/span>/g, '')).split(' → '));
const buyerOf = new Map(trading.Economies.map((economy) => [economy.Needs, economy]));
for (const names of loops) {
	assert.equal(names[0], names.at(-1), 'each trade loop returns to its start');
	for (let index = 0; index < names.length - 1; index += 1) {
		const from = trading.Economies.find((economy) => economy.Names[0] === names[index]);
		assert.equal(buyerOf.get(from?.Sells)?.Names[0], names[index + 1], `${names[index]}'s goods go to ${names[index + 1]}`);
	}
}
assert.equal(loops.reduce((sum, names) => sum + names.length - 1, 0), trading.Economies.length, 'the loops cover every economy once');

// ---------- every page: stacked cells are labelled, links and anchors resolve ----------
for (const path of ['expeditions', 'milestones', 'inventory-slots', 'trading']) {
	const html = await read(path);
	for (const table of html.match(/<table class="cr-table stack[\s\S]*?<\/table>/g) ?? []) {
		for (const cell of table.match(/<td[^>]*>/g) ?? []) assert(/data-label="/.test(cell), `${path}: stacked cell has a label`);
	}
	// The page's own content, not the shared sidebar and footer (which link Worker-rendered pages).
	const content = html.slice(html.indexOf('class="cr-wrap"'), html.indexOf('<footer'));
	for (const [, href, hash] of content.matchAll(/href="(\/[a-z-]+\/(?:[^"#/]+\/?)?)(?:#([^"]+))?"/g)) {
		if (/\.[a-z0-9]+$/i.test(href)) continue; // assets (fonts, images), not pages
		const target = `${DIST}${href.replace(/\/?$/, '/')}index.html`;
		assert(existsSync(target), `${path}: link resolves: ${href}`);
		if (hash) assert((await readFile(target, 'utf8')).includes(`id="${hash}"`), `${path}: anchor exists: ${href}#${hash}`);
	}
}

console.warn(`Verified ${shown.length} expeditions (${checkedRewards} rewards by phase), ${milestones.Journey.length} Journey ranks, milestone and standing ladders, inventory limits and ${trading.Economies.length} economies in ${loops.length} loops.`);
