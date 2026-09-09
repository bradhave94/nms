/**
 * The item feeds, image sitemap, and update cards must agree on which data
 * records have a page (or an explicit hub anchor).  The extractor also emits
 * sectioned metadata, so merely flattening the top-level data modules is not
 * sufficient.
 */

export type RouteRecord = {
	Id?: unknown;
	Name?: unknown;
	Icon?: unknown;
	Slug?: unknown;
	SourceFile?: unknown;
	SpaceBaseVariantOf?: unknown;
	RewardVariantOf?: unknown;
} & Record<string, unknown>;

export type RouteEligibleEntry<T extends RouteRecord = RouteRecord> = {
	item: T;
	url: string;
	aliases: T[];
};

type RouteBuilder<T extends RouteRecord> = (item: T) => string;

export const SUPPORTED_ITEM_ROUTE_SEGMENTS = new Set([
	'raw',
	'products',
	'food',
	'cooking',
	'curiosities',
	'fish',
	'technology',
	'other',
	'refinery',
	'nutrient-processor',
	'buildings',
	'upgrades',
	'exocraft',
	'starships',
	'corvette',
]);

const asNonEmptyString = (value: unknown): string | undefined => {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
};

const CREATURE_HUB_SEGMENTS = new Set([
	'arena',
	'affinities',
	'affinites',
	'moves',
	'companions',
	'species',
	'modes',
	'movesets',
	'accessories',
	'behaviours',
	'egg-overrides',
	'league',
	'rewards',
	'ai-configs',
]);

const normalizeRoute = (route: string): string => {
	const withLeadingSlash = route.startsWith('/') ? route : `/${route}`;
	return withLeadingSlash.replace(/\/+/g, '/');
};

/** Return true only for a generated item page or a supported creature hub anchor. */
export const isSupportedItemRoute = (route: string): boolean => {
	const normalized = normalizeRoute(route);
	const [path, hash = ''] = normalized.split('#', 2);
	if (path === '/creatures/arena' && hash.startsWith('pet-shop-')) return true;
	const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
	if (parts.length !== 2) {
		return false;
	}

	const [segment, id] = parts;
	if (SUPPORTED_ITEM_ROUTE_SEGMENTS.has(segment)) return true;
	return segment === 'creatures' && !CREATURE_HUB_SEGMENTS.has(id);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const hasId = (value: Record<string, unknown>): boolean =>
	asNonEmptyString(value.Id) !== undefined ||
	(typeof value.Id === 'number' && Number.isFinite(value.Id));

/**
 * Walk arrays and sectioned objects, stopping at records with an Id.  This
 * includes nested `Creatures.Species` and `Creatures.PetShop` entries while
 * preventing arbitrary nested payload objects from becoming cards.
 */
export const collectRouteCandidates = (sources: unknown): RouteRecord[] => {
	const candidates: RouteRecord[] = [];
	const seenObjects = new WeakSet<object>();

	const visit = (value: unknown): void => {
		if (Array.isArray(value)) {
			for (const entry of value) visit(entry);
			return;
		}
		if (!isRecord(value)) return;
		if (seenObjects.has(value)) return;
		seenObjects.add(value);

		if (hasId(value)) {
			candidates.push(value as RouteRecord);
			return;
		}

		for (const child of Object.values(value)) visit(child);
	};

	visit(sources);
	return candidates;
};

const recordKey = (item: RouteRecord): string | undefined => {
	const id = asNonEmptyString(item.Id);
	if (id) return id;
	return typeof item.Id === 'number' && Number.isFinite(item.Id) ? String(item.Id) : undefined;
};

const hasDisplayFields = (item: RouteRecord): boolean =>
	asNonEmptyString(item.Name) !== undefined && asNonEmptyString(item.Icon) !== undefined;

const variantTargetId = (item: RouteRecord, byId: Map<string, RouteRecord>): string | undefined => {
	const rewardTarget = asNonEmptyString(item.RewardVariantOf);
	if (rewardTarget && byId.has(rewardTarget)) return rewardTarget;

	if (Array.isArray(item.SpaceBaseVariantOf)) {
		for (const candidate of item.SpaceBaseVariantOf) {
			const target = asNonEmptyString(candidate);
			if (target && byId.has(target)) return target;
		}
	}

	return undefined;
};

const resolveCanonicalId = (
	id: string,
	byId: Map<string, RouteRecord>,
	seen = new Set<string>(),
): string => {
	if (seen.has(id)) return id;
	seen.add(id);
	const item = byId.get(id);
	if (!item) return id;
	const target = variantTargetId(item, byId);
	return target ? resolveCanonicalId(target, byId, seen) : id;
};

const uniqueById = <T extends RouteRecord>(items: T[]): T[] => {
	const seen = new Set<string>();
	return items.filter((item) => {
		const id = recordKey(item);
		if (!id || seen.has(id)) return false;
		seen.add(id);
		return true;
	});
};

const eligibleCandidates = <T extends RouteRecord>(
	sources: unknown,
	getRoute: RouteBuilder<T>,
): T[] =>
	uniqueById(collectRouteCandidates(sources) as T[]).filter((item) => {
		if (!recordKey(item) || !hasDisplayFields(item)) return false;
		try {
			return isSupportedItemRoute(getRoute(item));
		} catch {
			return false;
		}
	});

/**
 * Collect records that have a displayable icon and a real site route.  Items
 * whose explicit room/reward variant points at a known base are collapsed to
 * that base; their records remain available as search tokens through
 * `aliases`.  `knownSources` lets the update page collapse an alias against
 * an existing catalog item without promoting that existing item into the
 * update list.
 */
export const collectRouteEligibleItems = <T extends RouteRecord>(
	sources: unknown,
	getRoute: RouteBuilder<T>,
	knownSources?: unknown,
): RouteEligibleEntry<T>[] => {
	const ownItems = eligibleCandidates<T>(sources, getRoute);
	const knownItems = knownSources === undefined ? [] : eligibleCandidates<T>(knownSources, getRoute);
	const allItems = uniqueById([...ownItems, ...knownItems]);
	const byId = new Map(allItems.flatMap((item) => {
		const id = recordKey(item);
		return id ? [[id, item] as const] : [];
	}));
	const aliasesByCanonicalId = new Map<string, T[]>();

	for (const item of allItems) {
		const id = recordKey(item);
		if (!id) continue;
		const canonicalId = resolveCanonicalId(id, byId);
		if (canonicalId === id) continue;
		const aliases = aliasesByCanonicalId.get(canonicalId) ?? [];
		aliases.push(item);
		aliasesByCanonicalId.set(canonicalId, aliases);
	}

	return ownItems.flatMap((item) => {
		const id = recordKey(item);
		if (!id || resolveCanonicalId(id, byId) !== id) {
			// An update-only alias of an existing item should not appear as a new card.
			return [];
		}
		const url = getRoute(item);
		return [{ item, url, aliases: aliasesByCanonicalId.get(id) ?? [] }];
	});
};
