// /titles against its data: every title is listed once, ladders are in rank order, item links
// point at real pages, and pinned examples read the way the game shows them.
// Run after the build: pnpm run test:player-unlocks
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const DIST = existsSync('dist/client') ? 'dist/client' : 'dist';
const DATA = 'src/datav2';
const titles = JSON.parse(await readFile(`${DATA}/Titles.json`, 'utf8'));
const rowOf = (html, id) => html.match(new RegExp(`<tr id="${id}"[\\s\\S]*?</tr>`))?.[0] ?? '';

// ---------- /titles ----------
const titlesHtml = await readFile(`${DIST}/titles/index.html`, 'utf8');
const anchor = (id) => id.toLowerCase().replace(/_/g, '-');
for (const title of titles) {
	assert(titlesHtml.includes(`<tr id="${anchor(title.Id)}"`), `title ${title.Id} must be listed`);
}
assert.equal((titlesHtml.match(/<tr id="/g) ?? []).length, titles.length, 'each title is listed once');
assert(!titlesHtml.includes('%NAME%') && !titlesHtml.includes('%NUM%'), 'placeholders must be filled');

// Each ladder reads in order: by rank where the game ranks it, else by threshold.
const position = (title) => titlesHtml.indexOf(`<tr id="${anchor(title.Id)}"`);
const ladders = new Map();
for (const title of titles.filter((entry) => entry.Unlock.Type === 'Stat')) {
	ladders.set(title.Unlock.Stat, [...(ladders.get(title.Unlock.Stat) ?? []), title]);
}
const rung = (title) => [title.Unlock.LeveledStatRank === undefined ? 0 : 1, title.Unlock.LeveledStatRank ?? title.Unlock.Value];
for (const [stat, ladder] of ladders) {
	const expected = [...ladder].sort((a, b) => rung(a)[0] - rung(b)[0] || rung(a)[1] - rung(b)[1]).map((entry) => entry.Id);
	const shown = [...ladder].sort((a, b) => position(a) - position(b)).map((entry) => entry.Id);
	assert.deepEqual(shown, expected, `${stat} ladder must be in rank order`);
}
for (const title of titles.filter((entry) => entry.Unlock.LeveledStatRank)) {
	assert(rowOf(titlesHtml, anchor(title.Id)).includes(`Rank ${title.Unlock.LeveledStatRank}`), `${title.Id} shows its rank`);
}

const harvester = rowOf(titlesHtml, 't-spookpackage');
assert(harvester.includes('Gathered 20 haunting mementos'), 'Mind Harvester shows its threshold');
assert(harvester.includes('href="/other/GRUB_HAT/"'), 'Mind Harvester links the helmet it unlocks');
assert(rowOf(titlesHtml, 't-exo-kill').includes('Reward: Expedition 21'), 'titles granted by a reward name it');

for (const [, href] of titlesHtml.matchAll(/href="(\/(?:other|technology|upgrades|products|starships|curiosities|exocraft|corvette|buildings)\/[^"#]+)"/g)) {
	assert(existsSync(`${DIST}${href.replace(/\/?$/, '/')}index.html`), `linked item page exists: ${href}`);
}

console.warn(`Verified ${titles.length} titles.`);
