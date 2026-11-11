/**
 * Builds scripts/seed-alliance-page-views.sql from a GA4 runReport JSON file.
 *
 * Popular sort now reads a running page_views total in D1, incremented by the
 * site on each alliance-page visit. This script is only for the one-time
 * prefill (and for rebuilding that SQL from a saved report). It does not call
 * Google Analytics itself:
 *
 *   node scripts/seed-alliance-page-views.mjs --report path/to/ga-report.json
 *
 * How to pull the report (GA4 property 351228665, "nms - GA4", timezone
 * America/Toronto):
 *   - date range: 2026-09-16 (alliance guide pubDate; the directory landed
 *     2026-09-23) through yesterday
 *   - dimension: pagePath
 *   - metric: screenPageViews
 *   - dimension filter: pagePath begins with /alliances/
 *   - order: screenPageViews descending
 *   - limit: at least 250 rows
 *
 * A GA4 Data API runReport response is the JSON this script expects:
 * `{ rows: [{ dimension_values, metric_values }] }` with screenPageViews as
 * metric 0 (a second metric, if present, is ignored).
 *
 * Optional flags:
 *   --period-start YYYY-MM-DD   (default: 2026-09-16)
 *   --period-end YYYY-MM-DD     (default: yesterday, America/Toronto)
 *   --out path                  (default: scripts/seed-alliance-page-views.sql)
 *
 * Ranking rules: strip query strings, normalize trailing slashes, keep only
 * `/alliances/{slug}` (ignore the directory itself, /submit, /admin, and any
 * /edit/ path). Sum screenPageViews across remaining path variants of the same
 * slug. The SQL only updates rows still at page_views = 0 so a re-run will not
 * overwrite counts the site has already incremented.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'seed-alliance-page-views.sql');
const PROPERTY = '351228665';
const DEFAULT_PERIOD_START = '2026-09-16';
const SKIP_SLUGS = new Set(['submit', 'admin', 'views']);
const TORONTO = 'America/Toronto';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const args = new Map();
for (let i = 2; i < argv.length; i += 1) {
	const flag = argv[i];
	if (!flag.startsWith('--')) {
		console.error(`Unexpected argument: ${flag}`);
		exit(1);
	}
	const key = flag.slice(2);
	const value = argv[i + 1];
	if (!value || value.startsWith('--')) {
		console.error(`Missing value for --${key}`);
		exit(1);
	}
	args.set(key, value);
	i += 1;
}

const reportPath = args.get('report');
if (!reportPath) {
	console.error('Usage: node scripts/seed-alliance-page-views.mjs --report path/to/ga-report.json');
	exit(1);
}

const torontoYmd = (date) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: TORONTO,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);

const addUtcDays = (ymd, days) => {
	const utc = new Date(`${ymd}T00:00:00Z`);
	utc.setUTCDate(utc.getUTCDate() + days);
	return utc.toISOString().slice(0, 10);
};

const today = torontoYmd(new Date());
const periodEnd = args.get('period-end') ?? addUtcDays(today, -1);
const periodStart = args.get('period-start') ?? DEFAULT_PERIOD_START;

/** @param {string} raw */
const allianceSlugFromPagePath = (raw) => {
	const path = String(raw ?? '')
		.split('#', 1)[0]
		.split('?', 1)[0]
		.trim();
	if (!path.startsWith('/alliances/') && path !== '/alliances') return null;
	const rest = path.replace(/^\/alliances\/?/, '').replace(/\/+$/, '');
	if (!rest) return null;
	const parts = rest.split('/').filter(Boolean).map((part) => part.toLowerCase());
	if (parts.length !== 1) return null;
	const slug = parts[0];
	if (SKIP_SLUGS.has(slug) || !SLUG.test(slug)) return null;
	return slug;
};

/**
 * @param {{ rows?: Array<{ dimension_values?: Array<{ value?: string }>, metric_values?: Array<{ value?: string }> }> }} report
 * @returns {Map<string, number>}
 */
const aggregateAlliancePageViews = (report) => {
	const views = new Map();
	for (const row of report.rows ?? []) {
		const path = row.dimension_values?.[0]?.value;
		const count = Number(row.metric_values?.[0]?.value ?? 0);
		const slug = allianceSlugFromPagePath(path);
		if (!slug || !Number.isFinite(count) || count <= 0) continue;
		views.set(slug, (views.get(slug) ?? 0) + count);
	}
	return views;
};

const report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
const ranked = [...aggregateAlliancePageViews(report).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const sql = [
	'-- One-time prefill of alliances.page_views from GA4 screenPageViews.',
	`-- Period: ${periodStart} through ${periodEnd} (America/Toronto), property ${PROPERTY}.`,
	'-- Directory, submit, admin, and edit paths are excluded; slash variants are summed.',
	'-- Safe to re-run: only fills rows still at 0, so later live increments are kept.',
	'BEGIN TRANSACTION;',
	...ranked.map(([slug, count]) => `UPDATE alliances SET page_views = ${count} WHERE slug = '${slug}' AND page_views = 0;`),
	'COMMIT;',
	'',
].join('\n');

const outFile = args.get('out') ? resolve(args.get('out')) : DEFAULT_OUT;
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, sql);

console.warn(`Wrote ${ranked.length} slug updates for ${periodStart} to ${periodEnd}.`);
for (const [slug, count] of ranked.slice(0, 5)) {
	console.warn(`  ${slug}: ${count}`);
}

// Self-check: slash variants must sum, and reserved paths must be ignored.
const check = aggregateAlliancePageViews({
	rows: [
		{ dimension_values: [{ value: '/alliances/galactic-hub/' }], metric_values: [{ value: '314' }] },
		{ dimension_values: [{ value: '/alliances/galactic-hub' }], metric_values: [{ value: '3' }] },
		{ dimension_values: [{ value: '/alliances/' }], metric_values: [{ value: '5178' }] },
		{ dimension_values: [{ value: '/alliances/submit/' }], metric_values: [{ value: '637' }] },
		{ dimension_values: [{ value: '/alliances/admin' }], metric_values: [{ value: '26' }] },
		{ dimension_values: [{ value: '/alliances/foo/edit/' }], metric_values: [{ value: '6' }] },
		{ dimension_values: [{ value: '/alliances/views/' }], metric_values: [{ value: '9' }] },
	],
});
if (check.get('galactic-hub') !== 317 || check.size !== 1) {
	throw new Error(`Aggregator self-check failed: ${JSON.stringify([...check])}`);
}
