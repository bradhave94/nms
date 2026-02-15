export type JsonLdObject = Record<string, unknown>;

export type CollectionItem = {
	name: string;
	url: string;
	position: number;
};

type BreadcrumbEntry = {
	name: string;
	url: string;
};

type CollectionStructuredDataOptions = {
	siteOrigin: string;
	canonicalUrl: string;
	collectionName: string;
	collectionDescription: string;
	collectionPath: string;
	firstPagePath?: string;
	currentPage: number;
	items: CollectionItem[];
};

const normalizeOrigin = (origin: string): string => origin.replace(/\/$/, '');

const normalizePath = (path: string): string => {
	if (!path) return '/';
	return path.startsWith('/') ? path : `/${path}`;
};

const buildBreadcrumbList = (canonicalUrl: string, entries: BreadcrumbEntry[]): JsonLdObject => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	'@id': `${canonicalUrl}#breadcrumb`,
	itemListElement: entries.map((entry, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: entry.name,
		item: entry.url,
	})),
});

export const getSiteOrigin = (site: URL | undefined, currentUrl: URL): string => {
	const base = site ? new URL('/', site) : new URL('/', currentUrl);
	return normalizeOrigin(base.toString());
};

export const buildCollectionStructuredData = ({
	siteOrigin,
	canonicalUrl,
	collectionName,
	collectionDescription,
	collectionPath,
	firstPagePath: firstPagePathOverride,
	currentPage,
	items,
}: CollectionStructuredDataOptions): JsonLdObject[] => {
	const safeOrigin = normalizeOrigin(siteOrigin);
	const safePath = normalizePath(collectionPath);
	const firstPagePath = firstPagePathOverride
		? normalizePath(firstPagePathOverride).replace(/\/+$/, '') || '/'
		: safePath.replace(/\/+$/, '') || '/';
	const collectionUrl = `${safeOrigin}${firstPagePath}`;
	const breadcrumbEntries: BreadcrumbEntry[] = [
		{ name: 'Home', url: `${safeOrigin}/` },
		{ name: collectionName, url: collectionUrl },
	];

	if (currentPage > 1) {
		breadcrumbEntries.push({
			name: `Page ${currentPage}`,
			url: canonicalUrl,
		});
	}

	const breadcrumb = buildBreadcrumbList(canonicalUrl, breadcrumbEntries);
	const collectionPage: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		'@id': `${canonicalUrl}#collection`,
		url: canonicalUrl,
		name: currentPage > 1 ? `${collectionName} - Page ${currentPage}` : collectionName,
		description: collectionDescription,
		isPartOf: { '@id': `${safeOrigin}#website` },
		breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
		mainEntity: {
			'@type': 'ItemList',
			itemListOrder: 'https://schema.org/ItemListOrderAscending',
			numberOfItems: items.length,
			itemListElement: items.map((item) => ({
				'@type': 'ListItem',
				position: item.position,
				name: item.name,
				url: item.url,
			})),
		},
	};

	return [breadcrumb, collectionPage];
};
