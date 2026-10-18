import { getRouteEligibleCatalog } from '@utils/routeCatalog.js';
import { toWebp } from '@utils/icons.js';

/** Display labels for blog tags. Tags are stored as slugs ("chromatic-metal", "s-class"). */
const TAG_LABELS: Record<string, string> = {
	's-class': 'S-class',
	ios: 'iOS',
	'update-6-3': 'Update 6.3',
	'update-6-4': 'Update 6.4',
	'expedition-23': 'Expedition 23',
	'worlds-part-ii': 'Worlds Part II',
	'our-journey-continues': 'Our Journey Continues',
	'xeno-arena': 'Xeno Arena',
	cosmos: 'Cosmos',
	remnant: 'Remnant',
	aquarius: 'Aquarius',
	awakenings: 'Awakenings',
	voyagers: 'Voyagers',
	colossus: 'Colossus',
	'nutrient-processor': 'Nutrient Processor',
	'chromatic-metal': 'Chromatic Metal',
	'tainted metal': 'Tainted Metal',
	'runaway mould': 'Runaway Mould',
	'activated indium': 'Activated Indium',
	'gravitino coil': 'Gravitino Coil',
	'fusion ignitor': 'Fusion Ignitor',
	'stasis device': 'Stasis Device',
	'antimatter-housing': 'Antimatter Housing',
	'anomalous-doughnut': 'Anomalous Doughnut',
	'warp-cell': 'Warp Cell',
	quicksilver: 'Quicksilver',
	lithium: 'Lithium',
	chlorine: 'Chlorine',
};

export const tagLabel = (tag: string): string => {
	const key = tag.trim().toLowerCase();
	if (TAG_LABELS[key]) return TAG_LABELS[key];
	const words = key.replace(/[-_]+/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
};

export const formatPostDate = (date: Date, month: 'long' | 'short' = 'long'): string =>
	date.toLocaleDateString('en-US', { year: 'numeric', month, day: 'numeric', timeZone: 'UTC' });

export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/** The updated date, only when it is later than the publish date. */
export const laterUpdate = (pubDate: Date, updatedDate?: Date): Date | undefined =>
	updatedDate && updatedDate.getTime() > pubDate.getTime() ? updatedDate : undefined;

const normalisePath = (href: string): string => {
	const [path] = href.split(/[?#]/, 1);
	return path.endsWith('/') ? path : `${path}/`;
};

export type RelatedItem = { href: string; label: string; name: string; icon: string; colour: string };
export type RelatedPost = { href: string; label: string; slug: string };
export type RelatedTool = { href: string; label: string };
export type RelatedGroups = { items: RelatedItem[]; posts: RelatedPost[]; tools: RelatedTool[] };

let catalogByPath: Map<string, Record<string, unknown>> | undefined;
const itemAt = (href: string): Record<string, unknown> | undefined => {
	if (!catalogByPath) {
		catalogByPath = new Map();
		for (const { item, url } of getRouteEligibleCatalog()) {
			const path = normalisePath(url);
			if (!catalogByPath.has(path)) catalogByPath.set(path, item);
		}
	}
	if (href.includes('?')) return undefined;
	return catalogByPath.get(normalisePath(href));
};

/**
 * Splits a post's `relatedLinks` into item pages (shown with the game icon), other guides and
 * site tools, keeping the frontmatter order and labels.
 */
export const groupRelatedLinks = (links: { label: string; href: string }[]): RelatedGroups => {
	const groups: RelatedGroups = { items: [], posts: [], tools: [] };
	for (const link of links) {
		const blog = link.href.match(/^\/blog\/([^/?#]+)\/?$/);
		if (blog) {
			groups.posts.push({ href: `/blog/${blog[1]}/`, label: link.label, slug: blog[1] });
			continue;
		}
		const item = itemAt(link.href);
		if (item && typeof item.Icon === 'string' && item.Icon) {
			groups.items.push({
				href: link.href,
				label: link.label,
				name: String(item.Name ?? link.label),
				icon: `/images/items/${toWebp(item.Icon)}`,
				colour: `#${String(item.Colour ?? '1b2533').replace(/^#/, '')}`,
			});
			continue;
		}
		groups.tools.push({ href: link.href, label: link.label });
	}
	return groups;
};

/**
 * Post bodies sometimes jump from `##` to `####`. Lift any heading that skips a level to one
 * below the previous heading (h1 is the page title), so the outline never skips (WCAG 1.3.1).
 */
export const fixSkippedHeadings = (html: string): string => {
	let previous = 1;
	return html.replace(/<h([2-6])(\b[^>]*)>([\s\S]*?)<\/h\1>/g, (_match, level: string, attrs: string, inner: string) => {
		const depth = Math.min(Number(level), previous + 1);
		previous = depth;
		return `<h${depth}${attrs}>${inner}</h${depth}>`;
	});
};
