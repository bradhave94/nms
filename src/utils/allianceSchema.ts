/** Idempotent DDL, run on first connection and by scripts/seed-alliances.mjs. */
export const ALLIANCE_SCHEMA: string[] = [
	`CREATE TABLE IF NOT EXISTS alliances (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		slug TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		tag TEXT NOT NULL DEFAULT '',
		description TEXT NOT NULL,
		galaxy TEXT NOT NULL,
		region TEXT NOT NULL DEFAULT '',
		join_system TEXT NOT NULL,
		portal_glyphs TEXT NOT NULL DEFAULT '',
		platforms TEXT NOT NULL DEFAULT '[]',
		languages TEXT NOT NULL DEFAULT '',
		focuses TEXT NOT NULL DEFAULT '[]',
		color TEXT NOT NULL DEFAULT '#3591e6',
		discord_url TEXT NOT NULL DEFAULT '',
		website_url TEXT NOT NULL DEFAULT '',
		contact TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
		submitter_hash TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		approved_at TEXT
	)`,
	'CREATE INDEX IF NOT EXISTS alliances_status_idx ON alliances (status, approved_at)',
	'CREATE INDEX IF NOT EXISTS alliances_submitter_idx ON alliances (submitter_hash, created_at)',
	// Suggested changes to a listing. `proposed` is the full AllianceInput as JSON; its contact is the requester's.
	`CREATE TABLE IF NOT EXISTS alliance_edits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		alliance_id INTEGER NOT NULL,
		proposed TEXT NOT NULL,
		note TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
		submitter_hash TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		reviewed_at TEXT
	)`,
	'CREATE INDEX IF NOT EXISTS alliance_edits_status_idx ON alliance_edits (status, created_at)',
	'CREATE INDEX IF NOT EXISTS alliance_edits_submitter_idx ON alliance_edits (submitter_hash, created_at)',
];
