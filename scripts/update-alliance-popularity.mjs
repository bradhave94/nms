/**
 * Rebuilds src/data/alliancePopularity.json from a GA4 runReport JSON file.
 *
 * The public alliance directory sorts by unique visitors (activeUsers) when
 * Sort is Popular. This file is the snapshot that sort reads. It does not
 * call Google Analytics itself, so a weekly refresh does not need a
 * service-account secret in the repo. Pull a report, then run:
 *
 *   node scripts/update-alliance-popularity.mjs --report path/to/ga-report.json
 *
 * How to pull the report (GA4 property 351228665, "nms - GA4", timezone
 * America/Toronto):
 *   - date range: last 90 days ending yesterday
 *   - dimension: pagePath
 *   - metrics: screenPageViews, activeUsers
 *   - dimension filter: pagePath begins with /alliances/
 *   - order: screenPageViews descending
 *   - limit: at least 250 rows
 *
 * A GA4 Data API runReport response is the JSON this script expects:
 * `{ rows: [{ dimension_values, metric_values }] }` with metric order
 * [screenPageViews, activeUsers]. A report exported from the GA4 UI also
 * works if it has a `rows` array in that shape.
 *
 * Optional flags:
 *   --period-start YYYY-MM-DD   (default: 90 days before today, America/Toronto)
 *   --period-end YYYY-MM-DD     (default: yesterday, America/Toronto)
 *   --sitemap URL               (default: the live alliance sitemap, used so
 *                               approved listings with no traffic are stored as 0)
 *   --no-sitemap                skip the sitemap fetch; only store slugs seen in the report
 *   --out path                  (default: src/data/alliancePopularity.json)
 *
 * Ranking rules: strip query strings, normalize trailing slashes, keep only
 * `/alliances/{slug}` (ignore the directory itself, /submit, /admin, and any
 * /edit/ path). Sum activeUsers across remaining path variants of the same slug.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_SITEMAP = 'https://nomansskyrecipes.com/alliances/sitemap.xml';
const DEFAULT_OUT = new URL('../src/data/alliancePopularity.json', import.meta.url);
const PROPERTY = '351228665';
const SKIP_SLUGS = new Set(['submit', 'admin']);
const TORONTO = 'America/Toronto';

const args = new Map();
for (let i = 2; i < argv.length; i += 1) {
	const flag = argv[i];
	if (flag === '--no-sitemap') {
		args.set('noSitemap', true);
		continue;
	}
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
	console.error('Usage: node scripts/update-alliance-popularity.mjs --report path/to/ga-report.json');
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
const periodStart = args.get('period-start') ?? addUtcDays(today, -90);

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
	if (SKIP_SLUGS.has(slug)) return null;
	return slug;
};

/**
 * @param {{ rows?: Array<{ dimension_values?: Array<{ value?: string }>, metric_values?: Array<{ value?: string }> }> }} report
 * @returns {Map<string, number>}
 */
const aggregateAllianceVisitors = (report) => {
	const visitors = new Map();
	for (const row of report.rows ?? []) {
		const path = row.dimension_values?.[0]?.value;
		const users = Number(row.metric_values?.[1]?.value ?? 0);
		const slug = allianceSlugFromPagePath(path);
		if (!slug || !Number.isFinite(users)) continue;
		visitors.set(slug, (visitors.get(slug) ?? 0) + users);
	}
	return visitors;
};

const sitemapSlugs = async (url) => {
	const response = await fetch(url, {
		headers: {
			'user-agent': 'nomansskyrecipes.com alliance popularity snapshot',
			accept: 'application/xml,text/xml,text/plain,*/*',
		},
	});
	if (!response.ok) throw new Error(`Sitemap fetch failed: ${response.status} ${url}`);
	const xml = await response.text();
	const slugs = [];
	const seen = new Set();
	for (const match of xml.matchAll(/https?:\/\/[^<]+\/alliances\/([a-z0-9-]+)\/?/gi)) {
		const slug = match[1].toLowerCase();
		if (SKIP_SLUGS.has(slug) || seen.has(slug)) continue;
		seen.add(slug);
		slugs.push(slug);
	}
	if (slugs.length === 0) throw new Error(`No alliance slugs found in sitemap: ${url}`);
	return slugs;
};

const report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
const counted = aggregateAllianceVisitors(report);
const visitors = {};

if (args.get('noSitemap')) {
	for (const [slug, count] of counted) visitors[slug] = count;
} else {
	const sitemapUrl = args.get('sitemap') ?? DEFAULT_SITEMAP;
	for (const slug of await sitemapSlugs(sitemapUrl)) {
		visitors[slug] = counted.get(slug) ?? 0;
	}
	const extra = [...counted.keys()].filter((slug) => !(slug in visitors));
	if (extra.length) {
		console.warn(
			`GA report has ${extra.length} slug(s) not in the sitemap (omitted): ${extra.sort().join(', ')}`
		);
	}
}

const ranked = Object.entries(visitors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const output = {
	generatedAt: new Date().toISOString(),
	period: {
		start: periodStart,
		end: periodEnd,
		days: 90,
	},
	source: `GA4 property ${PROPERTY} (nms - GA4). Unique visitors (activeUsers) for /alliances/{slug}/ over the last 90 days ending yesterday, aggregated across trailing-slash variants. Directory, submit, admin, and edit paths are excluded.`,
	metric: 'activeUsers',
	visitors: Object.fromEntries(ranked),
};

const outFile = args.get('out') ? resolve(args.get('out')) : fileURLToPath(DEFAULT_OUT);
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(output, null, '\t')}\n`);

const withTraffic = ranked.filter(([, count]) => count > 0).length;
const zeros = ranked.length - withTraffic;
console.warn(
	`Wrote ${ranked.length} slugs (${withTraffic} with traffic, ${zeros} with 0) for ${periodStart} to ${periodEnd}.`
);
for (const [slug, count] of ranked.slice(0, 5)) {
	console.warn(`  ${slug}: ${count}`);
}

// Self-check: slash variants must sum, and reserved paths must be ignored.
const check = aggregateAllianceVisitors({
	rows: [
		{ dimension_values: [{ value: '/alliances/galactic-hub/' }], metric_values: [{ value: '0' }, { value: '206' }] },
		{ dimension_values: [{ value: '/alliances/galactic-hub' }], metric_values: [{ value: '0' }, { value: '3' }] },
		{ dimension_values: [{ value: '/alliances/' }], metric_values: [{ value: '0' }, { value: '1497' }] },
		{ dimension_values: [{ value: '/alliances/submit/' }], metric_values: [{ value: '0' }, { value: '308' }] },
		{ dimension_values: [{ value: '/alliances/admin' }], metric_values: [{ value: '0' }, { value: '19' }] },
		{ dimension_values: [{ value: '/alliances/foo/edit/' }], metric_values: [{ value: '0' }, { value: '6' }] },
	],
});
if (check.get('galactic-hub') !== 209 || check.size !== 1) {
	throw new Error(`Aggregator self-check failed: ${JSON.stringify([...check])}`);
}
