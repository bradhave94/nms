import { defineCollection, z } from 'astro:content';

const guides = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string().max(160),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		category: z.string(),
		tags: z.array(z.string()).default([]),
		author: z.string().default("No Man's Sky Recipes"),
		keywords: z.array(z.string()).default([]),
		relatedPages: z.array(z.string()).default([]),
		faq: z
			.array(
				z.object({
					question: z.string(),
					answer: z.string(),
				})
			)
			.default([]),
	})
});

export const collections = {
	guides,
};
