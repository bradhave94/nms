import type { JsonLdObject } from '@utils/structuredData.js';

type BreadcrumbItemInput = {
	name: string;
	url: string;
};

type BuildGuideStructuredDataOptions = {
	canonicalUrl: string;
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

	const articleSchema: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		'@id': `${canonicalUrl}#article`,
		mainEntityOfPage: canonicalUrl,
		headline: title,
		description,
		datePublished: publishedTime,
		dateModified: modifiedTime,
		author: {
			'@type': 'Person',
			name: authorName,
		},
		publisher: {
			'@type': 'Organization',
			name: "No Man's Sky Recipes",
		},
		breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
		...(image ? { image } : {}),
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

	return faqSchema ? [breadcrumbSchema, articleSchema, faqSchema] : [breadcrumbSchema, articleSchema];
};
