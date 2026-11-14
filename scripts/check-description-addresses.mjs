import assert from 'node:assert/strict';
import { findDescriptionAddresses, galacticToPortal, renderDescriptionWithGlyphs } from '../src/utils/descriptionAddresses.ts';

// Converter: worked examples from the No Man's Sky wiki (Galactic Coordinates page and its
// CoordGlyphConvert template) and the conversion table's edges.
const coords = (text) => galacticToPortal(...text.split(':').map((part) => Number.parseInt(part, 16)));
assert.equal(coords('046A:0081:0D6D:0038'), '00380256EC6B');
assert.equal(coords('0E8F:007F:01D8:0079'), '0079009D9690');
assert.equal(coords('0474:007C:01F1:0077'), '0077FD9F2C75', 'The Monty Python Club (wiki template gives the same)');
assert.equal(coords('07FF:007F:07FF:0001'), '000100000000', 'galaxy centre is portal 0,0,0');
assert.equal(coords('0000:0000:0000:0000'), '000081801801', 'galactic origin: Y=81, X/Z=801');
assert.equal(coords('0FFE:00FE:0FFE:0000'), '00007F7FF7FF', 'far corner: Y=7F, X/Z=7FF');

const find = (text) => findDescriptionAddresses(text).map(({ text: original, portal, kind }) => ({ original, portal, kind }));
const one = (text, original, portal, kind) =>
	assert.deepEqual(find(text), [{ original, portal, kind }], text);

// Galactic coordinates.
one('Galactic Address: 0474:007C:01F1:0077', '0474:007C:01F1:0077', '0077FD9F2C75', 'galactic');
one('coords 0474-007c-01f1-0077.', '0474-007c-01f1-0077', '0077FD9F2C75', 'galactic');
one('Signal booster: HUKYA:046A:0081:0D6D:0038', '046A:0081:0D6D:0038', '00380256EC6B', 'galactic');
one('(0474 007C 01F1 0077)', '0474 007C 01F1 0077', '0077FD9F2C75', 'galactic');

// Portal codes.
one('Portal: 0077FD9F2C75', '0077FD9F2C75', '0077FD9F2C75', 'portal');
one('glyphs 0077fd9f2c75 then warp', '0077fd9f2c75', '0077FD9F2C75', 'portal');
one('Address: 0077 FD9F 2C75', '0077 FD9F 2C75', '0077FD9F2C75', 'portal');
one('Glyphs - 0077-FD9F-2C75!', '0077-FD9F-2C75', '0077FD9F2C75', 'portal');
one('0077:FD9F:2C75', '0077:FD9F:2C75', '0077FD9F2C75', 'portal');
one('Portal 0 077 FD 9F2 C75', '0 077 FD 9F2 C75', '0077FD9F2C75', 'portal');
one('Our base is at 100104005005 near the centre', '100104005005', '100104005005', 'portal');
one('Glyphs: FACEDEADBEEF', 'FACEDEADBEEF', 'FACEDEADBEEF', 'portal');
// Three groups of four is the 4-4-4 portal grouping, not coordinates.
one('0474:007C:01F1', '0474:007C:01F1', '0474007C01F1', 'portal');
assert.equal(find('Two: 105FF3545C3E and 0474:007C:01F1:0077.').length, 2);

// Not addresses.
const none = (text) => assert.deepEqual(find(text), [], text);
none('We are a defacedfacade bunch');                 // hex letters only, no label
none('Founded 2026-11-14, events 18:30-20:00');      // dates and times
none('Call +44 7700 900123 or 1-800-555-1234');      // phone numbers
none('facebook.com/groups/7457325844298173');        // long ID inside a URL
none('https://example.com/0077FD9F2C75');            // address-like URL segment
none('ID 1234567890123');                            // 13 digits
none('id 0077FD9F2C75A');                            // 13 hex
none('a1b2c3d4e5f6a7');                              // 14 hex
none('0FFF:00FF:0FFF:0000');                         // outside the galaxy (unused edge)
none('1474:007C:01F1:0077');                         // not a game coordinate range
none('0474:007C-01F1:0077');                         // mixed separators
none('Serial 12 0077 FD9F 2C75');                    // part of a longer spaced number
none('Discord 123456789012345678');                  // snowflake

// Rendering keeps the original text (escaped) and adds glyphs after it.
const html = renderDescriptionWithGlyphs('Bring <cheese> & parrots.\n\nGalactic Address: 0474:007C:01F1:0077\nSee you!');
assert.ok(html.startsWith('Bring &lt;cheese&gt; &amp; parrots.\n\nGalactic Address: 0474:007C:01F1:0077<span class="description-portal">'));
assert.ok(html.includes('data-portal-address="0077FD9F2C75"'));
assert.ok(html.endsWith('</span>\nSee you!'));
assert.equal(renderDescriptionWithGlyphs('No address <here>'), 'No address &lt;here&gt;');

// Coordinates take the planet glyph from the listing's saved address when it's the same system.
const mpc = 'Galactic Address: 0474:007C:01F1:0077';
const withSaved = renderDescriptionWithGlyphs(mpc, '1077FD9F2C75');
assert.ok(withSaved.includes('data-portal-address="1077FD9F2C75"'), 'uses saved planet glyph');
assert.ok(!withSaved.includes('description-portal-note'), 'no planet note when the saved address matches');
assert.ok(renderDescriptionWithGlyphs(mpc, '1077-fd9f 2c75').includes('data-portal-address="1077FD9F2C75"'), 'saved address normalised');
const otherSystem = renderDescriptionWithGlyphs(mpc, '1078FD9F2C75');
assert.ok(otherSystem.includes('data-portal-address="0077FD9F2C75"') && otherSystem.includes('description-portal-note'), 'different system keeps 0 and the note');
const noSaved = renderDescriptionWithGlyphs(mpc, '');
assert.ok(noSaved.includes('data-portal-address="0077FD9F2C75"') && noSaved.includes('description-portal-note'), 'no saved address keeps 0 and the note');
const typed = renderDescriptionWithGlyphs('Portal: 0077FD9F2C75', '1077FD9F2C75');
assert.ok(typed.includes('data-portal-address="0077FD9F2C75"') && !typed.includes('data-portal-address="1077'), 'full portal codes stay as written');

console.warn('Description address checks passed.');
