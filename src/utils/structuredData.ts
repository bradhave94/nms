import { SITE } from '@config';

export type JsonLdObject = Record<string, unknown>;

const PAGE_ENTITY_TYPES = new Set([
	'WebPage',
	'ItemPage',
	'CollectionPage',
	'BlogPosting',
	'Article',
	'NewsArticle',
	'AboutPage',
	'ContactPage',
	'FAQPage',
]);

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

export const hasPageEntity = (schemas: JsonLdObject[]): boolean =>
	schemas.some(
		(schema) => typeof schema['@type'] === 'string' && PAGE_ENTITY_TYPES.has(schema['@type']),
	);

export const buildOrganizationSchema = (siteOrigin: string): JsonLdObject => {
	const safeOrigin = normalizeOrigin(siteOrigin);
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		'@id': `${safeOrigin}#organization`,
		name: SITE.title,
		url: `${safeOrigin}/`,
		logo: {
			'@type': 'ImageObject',
			url: `${safeOrigin}${SITE.logo.url}`,
			width: SITE.logo.width,
			height: SITE.logo.height,
		},
		sameAs: SITE.social,
	};
};

export const buildWebSiteSchema = (siteOrigin: string): JsonLdObject => {
	const safeOrigin = normalizeOrigin(siteOrigin);
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${safeOrigin}#website`,
		url: `${safeOrigin}/`,
		name: SITE.title,
		description: SITE.desc,
		inLanguage: 'en',
		publisher: { '@id': `${safeOrigin}#organization` },
		potentialAction: {
			'@type': 'SearchAction',
			target: `${safeOrigin}/items?q={search_term_string}`,
			'query-input': 'required name=search_term_string',
		},
	};
};

type BuildWebPageSchemaOptions = {
	siteOrigin: string;
	canonicalUrl: string;
	title: string;
	description: string;
	dateModified: string;
};

export const buildWebPageSchema = ({
	siteOrigin,
	canonicalUrl,
	title,
	description,
	dateModified,
}: BuildWebPageSchemaOptions): JsonLdObject => {
	const safeOrigin = normalizeOrigin(siteOrigin);
	return {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		'@id': `${canonicalUrl}#webpage`,
		url: canonicalUrl,
		name: title,
		description,
		isPartOf: { '@id': `${safeOrigin}#website` },
		dateModified,
		isAccessibleForFree: true,
		inLanguage: 'en',
	};
};

export const serializeJsonLdGraph = (entities: JsonLdObject[]): string => {
	const graph = entities.map((entity) => {
		const { '@context': _context, ...rest } = entity;
		return rest;
	});
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': graph,
	}).replace(/</g, '\\u003c');
};

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
