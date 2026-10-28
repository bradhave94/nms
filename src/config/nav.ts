// Site navigation: one source for the sidebar, the mobile drawer and the footer.
export interface NavItem {
	name: string;
	href: string;
	/** key into src/layouts/navIcons.ts */
	icon: string;
}

export const toolsNav: NavItem[] = [
	{ name: 'Refining', href: '/refining/', icon: 'funnel' },
	{ name: 'Cooking', href: '/cooking/', icon: 'beaker' },
	{ name: 'Crafting', href: '/crafting-guide/', icon: 'wrench-screwdriver' },
];

export const calculatorsNav: NavItem[] = [
	{ name: 'Calculator', href: '/calculator/', icon: 'calculator' },
	{ name: 'Crafting planner', href: '/calculator/planner/', icon: 'archive-box' },
	{ name: 'Reverse calculator', href: '/calculator/reverse/', icon: 'scale' },
	{ name: 'Farm calculator', href: '/calculator/farm/', icon: 'sun' },
	{ name: 'Base power calculator', href: '/calculator/power/', icon: 'bolt' },
];

export const catalogsNav: NavItem[] = [
	{ name: 'All items', href: '/items/', icon: 'squares-2x2' },
	{ name: 'Buildings', href: '/buildings/', icon: 'home-modern' },
	{ name: 'Corvette', href: '/corvette/', icon: 'globe-alt' },
	{ name: 'Creatures', href: '/creatures/', icon: 'bug-ant' },
	{ name: 'Curiosities', href: '/curiosities/', icon: 'question-mark-circle' },
	{ name: 'Exocraft', href: '/exocraft/', icon: 'rocket-launch' },
	{ name: 'Fish', href: '/fish/', icon: 'scale' },
	{ name: 'Food', href: '/food/', icon: 'cake' },
	{ name: 'Other', href: '/other/', icon: 'paper-clip' },
	{ name: 'Products', href: '/products/', icon: 'archive-box' },
	{ name: 'Raw materials', href: '/raw/', icon: 'bolt' },
	{ name: 'Starships', href: '/starships/', icon: 'paper-airplane' },
	{ name: 'Technology', href: '/technology/', icon: 'cog' },
	{ name: 'Titles', href: '/titles/', icon: 'sparkles' },
	{ name: 'Upgrades', href: '/upgrades/', icon: 'wrench' },
];

export const moreNav: NavItem[] = [
	{ name: 'Alliances', href: '/alliances/', icon: 'shield' },
	{ name: 'New items', href: '/new/', icon: 'sparkles' },
	{ name: 'Blog', href: '/blog/', icon: 'book-open' },
];

/** Footer-only links (kept out of the sidebar to keep it short). */
export const footerExtraNav: NavItem[] = [{ name: 'Feedback', href: '/feedback/', icon: 'envelope' }];

export const normalizePath = (path: string): string => path.replace(/\/+$/, '') || '/';

/** The nav href that best matches the current path (longest prefix), or null. */
export function bestMatchHref(pathname: string, hrefs: string[]): string | null {
	const current = normalizePath(pathname);
	let best: string | null = null;
	let bestLength = -1;
	for (const href of hrefs) {
		const h = normalizePath(href);
		if (current !== h && !current.startsWith(`${h}/`)) continue;
		if (h.length > bestLength) {
			best = href;
			bestLength = h.length;
		}
	}
	return best;
}
