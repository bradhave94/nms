/**
 * Alliance directory storage. Uses Turso (hosted SQLite) when the Vercel
 * integration's env vars are present, and a local SQLite file otherwise.
 */
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient, type Client, type InStatement, type Row } from '@libsql/client';
import { SQLITE_TURSO_AUTH_TOKEN, SQLITE_TURSO_DATABASE_URL } from 'astro:env/server';
import {
	ALLIANCE_STATUSES,
	slugify,
	validatedAllianceInputs,
	type Alliance,
	type AllianceInput,
	type AllianceStatus,
} from './alliances';
import { ALLIANCE_SCHEMA } from './allianceSchema';
import { ALLIANCE_SEEDS } from './allianceSeeds';

/** What the public pages may see: everything except the private moderator contact. */
export type PublicAlliance = Omit<Alliance, 'contact'>;

export type AllianceFilters = {
	q?: string;
	galaxy?: string;
	platform?: string;
	focus?: string;
	sort?: 'newest' | 'name';
};

const LOCAL_DATABASE_DIR = '.data';
const LOCAL_DATABASE_URL = `file:${LOCAL_DATABASE_DIR}/alliances.db`;

let clientPromise: Promise<Client> | undefined;

const connect = async (): Promise<Client> => {
	let url = SQLITE_TURSO_DATABASE_URL;
	if (!url) {
		// Vercel's filesystem is read-only and reset on deploy, so a file database can't work there.
		if (process.env.VERCEL) {
			throw new Error('SQLITE_TURSO_DATABASE_URL is not set for this deployment.');
		}
		mkdirSync(LOCAL_DATABASE_DIR, { recursive: true });
		url = LOCAL_DATABASE_URL;
	}
	const client = createClient({ url, authToken: SQLITE_TURSO_AUTH_TOKEN });
	await client.batch(ALLIANCE_SCHEMA, 'write');
	return client;
};

const db = (): Promise<Client> => {
	clientPromise ??= connect().catch((error: unknown) => {
		clientPromise = undefined;
		throw error;
	});
	return clientPromise;
};

const now = (): string => new Date().toISOString();

const parseList = (value: unknown): string[] => {
	try {
		const parsed: unknown = JSON.parse(String(value ?? '[]'));
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
};

const text = (value: unknown): string => (value == null ? '' : String(value));

const toStatus = (value: unknown): AllianceStatus =>
	ALLIANCE_STATUSES.find((status) => status === value) ?? 'pending';

const toAlliance = (row: Row): Alliance => ({
	id: Number(row.id),
	slug: text(row.slug),
	name: text(row.name),
	tag: text(row.tag),
	description: text(row.description),
	galaxy: text(row.galaxy),
	region: text(row.region),
	joinSystem: text(row.join_system),
	portalGlyphs: text(row.portal_glyphs),
	platforms: parseList(row.platforms),
	languages: text(row.languages),
	focuses: parseList(row.focuses),
	color: text(row.color),
	discordUrl: text(row.discord_url),
	websiteUrl: text(row.website_url),
	contact: text(row.contact),
	status: toStatus(row.status),
	createdAt: text(row.created_at),
	updatedAt: text(row.updated_at),
	approvedAt: row.approved_at == null ? null : text(row.approved_at),
});

const toPublicAlliance = (row: Row): PublicAlliance => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { contact, ...rest } = toAlliance(row);
	return rest;
};

const inputColumns = (input: AllianceInput) => ({
	name: input.name,
	tag: input.tag,
	description: input.description,
	galaxy: input.galaxy,
	region: input.region,
	join_system: input.joinSystem,
	portal_glyphs: input.portalGlyphs,
	platforms: JSON.stringify(input.platforms),
	languages: input.languages,
	focuses: JSON.stringify(input.focuses),
	color: input.color,
	discord_url: input.discordUrl,
	website_url: input.websiteUrl,
	contact: input.contact,
});

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (match) => `\\${match}`);

/** One-way hash so rate limiting never stores a raw IP address. */
export const hashSubmitter = (clientAddress: string): string =>
	createHash('sha256').update(`nms-alliances:${clientAddress}`).digest('hex');

export const listApprovedAlliances = async (filters: AllianceFilters = {}): Promise<PublicAlliance[]> => {
	const where = [`status = 'approved'`];
	const args: string[] = [];
	const q = filters.q?.trim();
	if (q) {
		const pattern = `%${escapeLike(q)}%`;
		where.push(
			`(name LIKE ? ESCAPE '\\' OR tag LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR region LIKE ? ESCAPE '\\' OR languages LIKE ? ESCAPE '\\')`
		);
		args.push(pattern, pattern, pattern, pattern, pattern);
	}
	if (filters.galaxy) {
		where.push('galaxy = ? COLLATE NOCASE');
		args.push(filters.galaxy);
	}
	if (filters.platform) {
		// An empty platform list means the alliance didn't restrict platforms.
		where.push(`(platforms = '[]' OR EXISTS (SELECT 1 FROM json_each(alliances.platforms) WHERE value = ?))`);
		args.push(filters.platform);
	}
	if (filters.focus) {
		where.push('EXISTS (SELECT 1 FROM json_each(alliances.focuses) WHERE value = ?)');
		args.push(filters.focus);
	}
	const orderBy = filters.sort === 'name' ? 'name COLLATE NOCASE ASC' : 'approved_at DESC, id DESC';
	const result = await (await db()).execute({
		sql: `SELECT * FROM alliances WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`,
		args,
	});
	return result.rows.map(toPublicAlliance);
};

export const listApprovedGalaxies = async (): Promise<Array<{ galaxy: string; count: number }>> => {
	const result = await (await db()).execute(
		`SELECT galaxy, COUNT(*) AS count FROM alliances WHERE status = 'approved'
		 GROUP BY galaxy COLLATE NOCASE ORDER BY count DESC, galaxy ASC`
	);
	return result.rows.map((row) => ({ galaxy: text(row.galaxy), count: Number(row.count) }));
};

export const getApprovedAllianceBySlug = async (slug: string): Promise<PublicAlliance | undefined> => {
	const result = await (await db()).execute({
		sql: `SELECT * FROM alliances WHERE slug = ? AND status = 'approved'`,
		args: [slug],
	});
	const row = result.rows[0];
	return row ? toPublicAlliance(row) : undefined;
};

export const countRecentSubmissions = async (submitterHash: string, hours: number): Promise<number> => {
	const since = new Date(Date.now() - hours * 3_600_000).toISOString();
	const result = await (await db()).execute({
		sql: 'SELECT COUNT(*) AS count FROM alliances WHERE submitter_hash = ? AND created_at >= ?',
		args: [submitterHash, since],
	});
	return Number(result.rows[0]?.count ?? 0);
};

const uniqueSlug = async (client: Client, name: string): Promise<string> => {
	const base = slugify(name);
	const result = await client.execute({
		sql: `SELECT slug FROM alliances WHERE slug = ? OR slug LIKE ? ESCAPE '\\'`,
		args: [base, `${escapeLike(base)}-%`],
	});
	const taken = new Set(result.rows.map((row) => text(row.slug)));
	if (!taken.has(base)) return base;
	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
};

type CreateOptions = { submitterHash?: string; status?: AllianceStatus };

export const createAlliance = async (input: AllianceInput, options: CreateOptions = {}): Promise<Alliance> => {
	const client = await db();
	const status = options.status ?? 'pending';
	const timestamp = now();
	const columns = {
		...inputColumns(input),
		slug: await uniqueSlug(client, input.name),
		status,
		submitter_hash: options.submitterHash ?? '',
		created_at: timestamp,
		updated_at: timestamp,
		approved_at: status === 'approved' ? timestamp : null,
	};
	const names = Object.keys(columns);
	const result = await client.execute({
		sql: `INSERT INTO alliances (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')}) RETURNING *`,
		args: Object.values(columns),
	});
	return toAlliance(result.rows[0]);
};

// ── Moderation ──────────────────────────────────────────────────────────────

export const listAlliancesByStatus = async (status: AllianceStatus): Promise<Alliance[]> => {
	const result = await (await db()).execute({
		sql: `SELECT * FROM alliances WHERE status = ? ORDER BY ${status === 'approved' ? 'approved_at DESC' : 'created_at DESC'}`,
		args: [status],
	});
	return result.rows.map(toAlliance);
};

export const countAlliancesByStatus = async (): Promise<Record<AllianceStatus, number>> => {
	const result = await (await db()).execute('SELECT status, COUNT(*) AS count FROM alliances GROUP BY status');
	const counts: Record<AllianceStatus, number> = { pending: 0, approved: 0, rejected: 0 };
	for (const row of result.rows) counts[toStatus(row.status)] = Number(row.count);
	return counts;
};

export const getAllianceById = async (id: number): Promise<Alliance | undefined> => {
	const result = await (await db()).execute({ sql: 'SELECT * FROM alliances WHERE id = ?', args: [id] });
	const row = result.rows[0];
	return row ? toAlliance(row) : undefined;
};

export const updateAlliance = async (id: number, input: AllianceInput): Promise<void> => {
	const columns = { ...inputColumns(input), updated_at: now() };
	await (await db()).execute({
		sql: `UPDATE alliances SET ${Object.keys(columns).map((name) => `${name} = ?`).join(', ')} WHERE id = ?`,
		args: [...Object.values(columns), id],
	});
};

export const setAllianceStatus = async (id: number, status: AllianceStatus): Promise<void> => {
	const timestamp = now();
	const statement: InStatement =
		status === 'approved'
			? {
					sql: 'UPDATE alliances SET status = ?, updated_at = ?, approved_at = COALESCE(approved_at, ?) WHERE id = ?',
					args: [status, timestamp, timestamp, id],
				}
			: { sql: 'UPDATE alliances SET status = ?, updated_at = ? WHERE id = ?', args: [status, timestamp, id] };
	await (await db()).execute(statement);
};

export const deleteAlliance = async (id: number): Promise<void> => {
	await (await db()).execute({ sql: 'DELETE FROM alliances WHERE id = ?', args: [id] });
};

/** Adds the starter listings (verified ones approved), skipping any whose name is already listed. */
export const importStarterAlliances = async (): Promise<number> => {
	const client = await db();
	let added = 0;
	const inputs = validatedAllianceInputs(ALLIANCE_SEEDS);
	for (const [index, input] of inputs.entries()) {
		const existing = await client.execute({
			sql: 'SELECT 1 FROM alliances WHERE name = ? COLLATE NOCASE',
			args: [input.name],
		});
		if (existing.rows.length > 0) continue;
		await createAlliance(input, { status: ALLIANCE_SEEDS[index].approved ? 'approved' : 'pending' });
		added += 1;
	}
	return added;
};
