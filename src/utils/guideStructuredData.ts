import type { JsonLdObject } from '@utils/structuredData.js';
import { buildPageSignals } from '@utils/structuredData.js';

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

const isHowToGuide = (title: string): boolean => /\bhow to\b|\bguide\b/i.test(title);

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

	const blogPostingSchema: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		'@id': `${canonicalUrl}#article`,
		mainEntityOfPage: { '@id': `${canonicalUrl}#article` },
		headline: title,
		description,
		datePublished: publishedTime,
		author: {
			'@type': 'Person',
			name: authorName,
		},
		publisher: { '@id': `${siteOrigin}#organization` },
		breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
		...buildPageSignals({ siteOrigin, dateModified: modifiedTime.slice(0, 10) }),
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

	const howToSchema: JsonLdObject | undefined = isHowToGuide(title)
		? {
				'@context': 'https://schema.org',
				'@type': 'HowTo',
				'@id': `${canonicalUrl}#howto`,
				name: title,
				description,
				step:
					faqs.length > 0
						? faqs.map((faq, index) => ({
								'@type': 'HowToStep',
								position: index + 1,
								name: faq.question,
								text: faq.answer,
								url: `${canonicalUrl}#faq-${index + 1}`,
							}))
						: [
								{
									'@type': 'HowToStep',
									position: 1,
									name: title,
									text: description,
								},
							],
			}
		: undefined;

	const schemas: JsonLdObject[] = [breadcrumbSchema, blogPostingSchema];
	if (howToSchema) schemas.push(howToSchema);
	if (faqSchema) schemas.push(faqSchema);
	return schemas;
};
