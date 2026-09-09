import * as dataSources from '@datav2/index.js';
import { getSlug } from '@utils/lookup.js';
import {
	collectRouteEligibleItems,
	type RouteEligibleEntry,
	type RouteRecord,
} from '@utils/routeEligible.js';

const catalogSources = Object.entries(dataSources)
	.filter(([name]) => name !== 'NewUpdate')
	.map(([, source]) => source);

const getItemRoute = (item: RouteRecord): string =>
	getSlug({
		Id: String(item.Id ?? ''),
		...(typeof item.Slug === 'string' ? { Slug: item.Slug } : {}),
		...(typeof item.SourceFile === 'string' ? { SourceFile: item.SourceFile } : {}),
	});

/** The canonical, displayable catalog shared by item feeds and the image sitemap. */
export const getRouteEligibleCatalog = (): RouteEligibleEntry[] =>
	collectRouteEligibleItems(catalogSources, getItemRoute);

/**
 * Update entries use the current catalog as an alias lookup.  An alias of an
 * existing item is therefore omitted from `/new`, while a genuinely new
 * species such as `DIPLO_PET` remains eligible through its nested creature
 * record route.
 */
export const getRouteEligibleNewItems = (items: unknown): RouteEligibleEntry[] => {
	const catalog = getRouteEligibleCatalog();
	const knownItems = catalog.flatMap(({ item, aliases }) => [item, ...aliases]);
	return collectRouteEligibleItems(items, getItemRoute, knownItems);
};

