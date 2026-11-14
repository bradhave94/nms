/**
 * Finds portal addresses and signal-booster galactic coordinates that alliance owners paste into
 * their free-text description, so the alliance page can show the glyphs next to the original text.
 * The stored description is never changed: renderDescriptionWithGlyphs escapes the text as-is and
 * only inserts the glyph markup (renderPortalAddressHtml) after each address it recognises.
 */
import { renderPortalAddressHtml } from './portalGlyphs.ts';

/**
 * Signal-booster galactic coordinates (XXXX:YYYY:ZZZZ:SSSS, hex, origin at a galaxy corner) to a
 * 12-digit portal address (P SSS YY ZZZ XXX, origin at the galaxy centre). Per the No Man's Sky
 * wiki (Galactic Coordinates, Portal address): X and Z add 0x801 mod 0x1000, Y adds 0x81 mod 0x100,
 * the system index is copied, and the planet index is 0 because coordinates don't name a planet.
 * Worked examples from the wiki: 046A:0081:0D6D:0038 -> 00380256EC6B, 0E8F:007F:01D8:0079 -> 0079009D9690.
 */
export const galacticToPortal = (x: number, y: number, z: number, system: number, planet = 0): string => {
	const hex = (value: number, width: number) => value.toString(16).toUpperCase().padStart(width, '0');
	return hex(planet & 0xf, 1)
		+ hex(system & 0xfff, 3)
		+ hex((y + 0x81) & 0xff, 2)
		+ hex((z + 0x801) & 0xfff, 3)
		+ hex((x + 0x801) & 0xfff, 3);
};

export interface DescriptionAddress {
	/** Where the address text starts and ends in the description (end is exclusive). */
	start: number;
	end: number;
	/** The text exactly as written, e.g. `0474:007C:01F1:0077`. */
	text: string;
	/** 12 uppercase hex digits. */
	portal: string;
	kind: 'portal' | 'galactic';
}

const H = '[0-9A-Fa-f]';
/** A label in the few words before an address lets an all-letter code through (e.g. "Glyphs: ...") */
const LABEL = /\b(?:portal|glyphs?|address|addr|coords?|coordinates)\b[^\n]{0,24}$/i;

/**
 * Galactic coordinates: four colon-, dash- or space-separated groups of four hex digits with the
 * ranges the game uses (X and Z 0000-0FFE, Y 0000-00FE, system 0000-0FFF), optionally after the
 * signal booster's letter prefix (HUKYA:046A:0081:0D6D:0038). The prefix stays in the text but
 * not in `text`. The separator must be the same throughout.
 */
const GALACTIC = new RegExp(
	`(?<![0-9A-Za-z_/.=#?&@%+]|${H}[:-])`
	+ `(?:[A-Za-z]{2,12}:)?`
	+ `(?<coords>(?<x>0${H}{3})(?<sep>[:\\- ])(?<y>00${H}{2})\\k<sep>(?<z>0${H}{3})\\k<sep>(?<s>0${H}{3}))`
	+ `(?![0-9A-Za-z_]|[:-]${H})`,
	'g',
);

/**
 * Portal codes: exactly 12 hex digits, written together or in one of the groupings people use
 * (4-4-4, 1-3-2-3-3 as P SSS YY ZZZ XXX, 1-3-8, 3-3-3-3, 6-6, 2-2-2-2-2-2), separated by
 * spaces, dashes or colons (one kind per address). It must not touch other letters or digits,
 * so longer IDs, hashes and URLs are skipped.
 */
const GROUPINGS = [[12], [4, 4, 4], [1, 3, 2, 3, 3], [1, 3, 8], [3, 3, 3, 3], [6, 6], [2, 2, 2, 2, 2, 2]];
const PORTAL = new RegExp(
	`(?<![0-9A-Za-z_/.=#?&@%+]|${H}[:-])(?:${GROUPINGS.map((sizes) => {
		const [first, ...rest] = sizes;
		return `${H}{${first}}${rest.map((size, index) => (index === 0 ? `(?<sep${sizes.join('')}>[:\\- ])` : `\\k<sep${sizes.join('')}>`) + `${H}{${size}}`).join('')}`;
	}).join('|')})(?![0-9A-Za-z_]|[:-]${H})`,
	'g',
);

/** A neighbouring space-separated group with a digit means the match is part of a longer number. */
const SPACED_NEIGHBOUR_BEFORE = new RegExp(`(?:^|[^0-9A-Za-z_])(?=${H}*\\d)${H}+ $`);
const SPACED_NEIGHBOUR_AFTER = new RegExp(`^ (?=${H}*\\d)${H}+(?![0-9A-Za-z_])`);

const overlaps = (found: DescriptionAddress[], start: number, end: number) =>
	found.some((address) => start < address.end && end > address.start);

export const findDescriptionAddresses = (description: string): DescriptionAddress[] => {
	const found: DescriptionAddress[] = [];
	const spacedNeighbour = (start: number, end: number, text: string) =>
		/ /.test(text)
		&& (SPACED_NEIGHBOUR_BEFORE.test(description.slice(Math.max(0, start - 20), start))
			|| SPACED_NEIGHBOUR_AFTER.test(description.slice(end, end + 20)));

	for (const match of description.matchAll(GALACTIC)) {
		const groups = match.groups ?? {};
		const text = groups.coords ?? '';
		const end = (match.index ?? 0) + match[0].length;
		const start = end - text.length;
		const [x, y, z, s] = [groups.x, groups.y, groups.z, groups.s].map((value) => Number.parseInt(value ?? '', 16));
		// 0FFF / 00FF are outside the map (the portal network's unused edge).
		if (x > 0xffe || y > 0xfe || z > 0xffe) continue;
		if (spacedNeighbour(start, end, text)) continue;
		found.push({ start, end, text, portal: galacticToPortal(x, y, z, s), kind: 'galactic' });
	}

	for (const match of description.matchAll(PORTAL)) {
		const text = match[0];
		const start = match.index ?? 0;
		const end = start + text.length;
		if (overlaps(found, start, end)) continue;
		const portal = text.replace(/[\s:-]/g, '').toUpperCase();
		// Ordinary words spelled with A-F ("defaced") need a label such as "Portal:" before them.
		if (!/\d/.test(portal) && !LABEL.test(description.slice(Math.max(0, start - 40), start))) continue;
		if (spacedNeighbour(start, end, text)) continue;
		found.push({ start, end, text, portal, kind: 'portal' });
	}

	return found.sort((a, b) => a.start - b.start);
};

const escapeHtml = (text: string): string =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * The description as escaped HTML, unchanged, with each address it contains followed by its
 * glyphs (and a note when they were converted from galactic coordinates). Phrasing content only,
 * so it stays valid inside the description paragraph.
 */
export const renderDescriptionWithGlyphs = (description: string): string => {
	let html = '';
	let cursor = 0;
	for (const address of findDescriptionAddresses(description)) {
		html += escapeHtml(description.slice(cursor, address.end));
		html += `<span class="description-portal">`;
		if (address.kind === 'galactic') {
			html += `<span class="description-portal-note">Portal glyphs for the coordinates ${escapeHtml(address.text)} (the first glyph, the planet, is 0 because coordinates don't name a planet):</span>`;
		}
		html += renderPortalAddressHtml(address.portal);
		html += `</span>`;
		cursor = address.end;
	}
	return html + escapeHtml(description.slice(cursor));
};
