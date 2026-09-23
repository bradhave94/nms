/**
 * Loads the starter listings (src/utils/allianceSeeds.ts). Verified ones are approved, the rest pending.
 * Local SQLite: pnpm run seed:alliances
 * Production: use "Load starter listings" on /alliances/admin/. The Turso
 * credentials are sensitive env vars and can't be pulled locally.
 *
 * Safe to re-run: alliances whose name already exists are skipped.
 */
import { mkdirSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { ALLIANCE_SCHEMA } from '../src/utils/allianceSchema.ts';
import { slugify, validatedAllianceInputs } from '../src/utils/alliances.ts';
import { ALLIANCE_SEEDS } from '../src/utils/allianceSeeds.ts';

const url = process.env.SQLITE_TURSO_DATABASE_URL || 'file:.data/alliances.db';
if (url.startsWith('file:')) mkdirSync('.data', { recursive: true });
const client = createClient({ url, authToken: process.env.SQLITE_TURSO_AUTH_TOKEN });
await client.batch(ALLIANCE_SCHEMA, 'write');

const seeds = validatedAllianceInputs(ALLIANCE_SEEDS);
let added = 0;
for (const [index, input] of seeds.entries()) {
	const status = ALLIANCE_SEEDS[index].approved ? 'approved' : 'pending';
	const existing = await client.execute({ sql: 'SELECT 1 FROM alliances WHERE name = ? COLLATE NOCASE', args: [input.name] });
	if (existing.rows.length > 0) continue;
	const timestamp = new Date().toISOString();
	await client.execute({
		sql: `INSERT INTO alliances (slug, name, tag, description, galaxy, region, join_system, portal_glyphs, platforms,
			languages, focuses, color, discord_url, website_url, contact, status, created_at, updated_at, approved_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			slugify(input.name), input.name, input.tag, input.description, input.galaxy, input.region, input.joinSystem,
			input.portalGlyphs, JSON.stringify(input.platforms), input.languages, JSON.stringify(input.focuses), input.color,
			input.discordUrl, input.websiteUrl, input.contact, status, timestamp, timestamp, status === 'approved' ? timestamp : null,
		],
	});
	added += 1;
}
console.warn(`Seeded ${added} alliances (${seeds.length - added} already present) into ${url.split('?')[0].replace(/\/\/.*@/, '//')}.`);
