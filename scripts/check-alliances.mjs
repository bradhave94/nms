/* global FormData */
import assert from 'node:assert/strict';
import {
	EMPTY_ALLIANCE_INPUT,
	GALAXIES,
	allianceInputFromForm,
	findGalaxy,
	formatPortalGlyphs,
	isDiscordInvite,
	slugify,
	validateAllianceInput,
} from '../src/utils/alliances.ts';
import { findCommunityBanners } from '../src/utils/allianceBanners.ts';

const form = (fields) => {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		for (const item of [].concat(value)) data.append(name, item);
	}
	return data;
};

const valid = {
	name: '  Alliance of Galactic Travellers ',
	tag: 'AGT_',
	description: 'A nomadic exploration community.\r\n\r\n\r\n\r\nNew travellers are welcome.',
	galaxy: 'Euclid',
	region: 'Yihelli Quadrant',
	joinSystem: 'AGT Embassy',
	portalGlyphs: '105f-f354 5c3e',
	platforms: ['Xbox', 'PC', 'Dreamcast'],
	languages: 'English',
	focuses: ['Exploration', 'Building'],
	color: '#FF9E00',
	discordUrl: 'https://discord.gg/kdRpmbMmQ3',
	websiteUrl: 'https://www.nms-agt.com/',
	contact: 'traveller#1',
};

// Parsing normalises input and drops unknown options.
const parsed = allianceInputFromForm(form(valid));
assert.equal(parsed.name, 'Alliance of Galactic Travellers');
assert.equal(parsed.portalGlyphs, '105FF3545C3E');
assert.deepEqual(parsed.platforms, ['PC', 'Xbox'], 'keeps known platforms in canonical order');
assert.equal(parsed.description, 'A nomadic exploration community.\n\nNew travellers are welcome.');
assert.equal(parsed.color, '#ff9e00');

const ok = validateAllianceInput(parsed);
assert.ok(ok.ok, JSON.stringify(!ok.ok && ok.errors));

// Required fields.
const empty = validateAllianceInput({ ...EMPTY_ALLIANCE_INPUT, galaxy: '' });
assert.ok(!empty.ok);
assert.deepEqual(Object.keys(empty.errors).sort(), ['contact', 'description', 'galaxy', 'joinSystem', 'name']);

// In-game rules: names up to 31 characters, tags exactly 4 of A–Z, 0–9, space, _ or -.
const check = (overrides) => validateAllianceInput({ ...parsed, ...overrides });
assert.ok(check({ name: 'x'.repeat(31) }).ok);
assert.ok(!check({ name: 'x'.repeat(32) }).ok);
for (const tag of ['UOAS', 'AB-1', 'a_b ', '']) assert.ok(check({ tag }).ok, `tag "${tag}" should be allowed`);
for (const tag of ['ABC', 'ABCDE', 'AB!C', 'ÄBCD']) assert.ok(!check({ tag }).ok, `tag "${tag}" should be rejected`);

// Portal addresses, links and colours.
assert.ok(!check({ portalGlyphs: '105FF3545C3' }).ok);
assert.ok(!check({ portalGlyphs: '105FF3545C3G' }).ok);
assert.equal(formatPortalGlyphs('105FF3545C3E'), '105F F354 5C3E');
assert.ok(isDiscordInvite('https://discord.gg/abc'));
assert.ok(isDiscordInvite('https://discord.com/invite/abc'));
assert.ok(!isDiscordInvite('https://discord.com/channels/1/2'));
assert.ok(!isDiscordInvite('http://discord.gg/abc'));
assert.ok(!isDiscordInvite('https://discord.gg.evil.example/abc'));
assert.ok(!check({ websiteUrl: 'javascript:alert(1)' }).ok);
assert.ok(!check({ websiteUrl: 'http://example.com' }).ok);
assert.ok(!check({ focuses: ['Exploration', 'Building', 'Trading', 'Combat', 'Social'] }).ok);
const badColour = check({ color: 'red;background:url(x)' });
assert.ok(badColour.ok);
assert.equal(badColour.value.color, '#3591e6', 'invalid colours fall back to the default');
assert.equal(check({ color: '#123456' }).value.color, '#3591e6', 'colours outside the game palette fall back to the default');

// Slugs.
assert.equal(slugify('Corvettes & Coffee'), 'corvettes-and-coffee');
assert.equal(slugify('The Elysium Arcænum'), 'the-elysium-arcaenum');
assert.equal(slugify('Élan Vital'), 'elan-vital');
assert.equal(slugify('日本人コミュニティ'), 'alliance');
assert.equal(slugify('Submit'), 'submit-alliance');
assert.equal(slugify('admin'), 'admin-alliance');

// Galaxies: all 256, canonical names, unknown names rejected.
assert.equal(GALAXIES.length, 256);
assert.equal(findGalaxy('  eissentam ')?.number, 10);
assert.equal(check({ galaxy: 'zavainlani' }).value.galaxy, 'Zavainlani');
assert.ok(!check({ galaxy: 'Andromeda' }).ok);

// Community banner matching.
assert.equal(findCommunityBanners('The Qitanian Empire')?.banner.href, '/other/BANNER_QIT/');
assert.equal(findCommunityBanners("No Man's Sky Francophone")?.decal.href, '/buildings/DECAL_NMS_FR/');
assert.equal(findCommunityBanners('cafe 42')?.banner.icon, 'BANNER_CAFE.png');
assert.equal(findCommunityBanners('Eisvana'), undefined);

console.warn('Alliance validation checks passed.');
