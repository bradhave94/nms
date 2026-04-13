import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
	schema: z.object({
		title: z.string(),
		description: z.string().max(160),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		category: z.string(),
		tags: z.array(z.string()).default([]),
		featured: z.boolean().default(false),
		relatedLinks: z
			.array(
				z.object({
					label: z.string(),
					href: z.string(),
				})
			)
			.default([]),
		faqs: z
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
