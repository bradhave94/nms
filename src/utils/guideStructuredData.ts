import type { JsonLdObject } from '@utils/structuredData.js';
import { buildPageSignals, getGameId } from '@utils/structuredData.js';

type BreadcrumbItemInput = {
	name: string;
	url: string;
};

type BuildGuideStructuredDataOptions = {
	canonicalUrl: string;
	/** The page's <title>, for the WebPage node; `title` is the post headline. */
	pageTitle: string;
	title: string;
	description: string;
	publishedTime: string;
	modifiedTime: string;
	authorName: string;
	image?: string;
	breadcrumbs: BreadcrumbItemInput[];
	keywords?: string[];
	faqs?: Array<{
		question: string;
		answer: string;
	}>;
};

export const buildGuideStructuredData = ({
	canonicalUrl,
	pageTitle,
	title,
	description,
	publishedTime,
	modifiedTime,
	authorName = "No Man's Sky Recipes",
	image,
	breadcrumbs,
	keywords,
	faqs = [],
}: BuildGuideStructuredDataOptions): JsonLdObject[] => {
	const siteOrigin = new URL(canonicalUrl).origin;
	const breadcrumbSchema: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		'@id': `${canonicalUrl}#breadcrumb`,
		itemListElement: breadcrumbs.map((breadcrumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: breadcrumb.name,
			item: breadcrumb.url,
		})),
	};

	const pageSignals = buildPageSignals({ siteOrigin, dateModified: modifiedTime.slice(0, 10) });
	const webPageSchema: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		'@id': `${canonicalUrl}#webpage`,
		url: canonicalUrl,
		name: pageTitle,
		description,
		breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
		...pageSignals,
		datePublished: publishedTime,
		...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image } } : {}),
	};

	const blogPostingSchema: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		'@id': `${canonicalUrl}#article`,
		mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
		headline: title,
		description,
		datePublished: publishedTime,
		author: {
			'@type': 'Person',
			name: authorName,
		},
		publisher: { '@id': `${siteOrigin}#organization` },
		about: { '@id': getGameId(siteOrigin) },
		...pageSignals,
		...(image ? { image: { '@type': 'ImageObject', url: image } } : {}),
		...(keywords && keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
	};

	const faqSchema: JsonLdObject | undefined =
		faqs.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'FAQPage',
					mainEntity: faqs.map((faq) => ({
						'@type': 'Question',
						name: faq.question,
						acceptedAnswer: {
							'@type': 'Answer',
							text: faq.answer,
						},
					})),
				}
			: undefined;

	// FAQPage only mirrors the FAQ that GuideLayout renders on the page.
	const schemas: JsonLdObject[] = [webPageSchema, breadcrumbSchema, blogPostingSchema];
	if (faqSchema) schemas.push(faqSchema);
	return schemas;
};
