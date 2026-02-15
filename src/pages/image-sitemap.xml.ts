import type { APIRoute } from 'astro';
import { SITE } from '@config';
import { getSlug, sort } from '@utils/lookup.js';
import type { Item } from '@utils/lookup.js';
import * as dataSources from '@datav2/index.js';

const escapeXml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const prerender = true;

export const GET: APIRoute = ({ site, url }) => {
	const siteOrigin = (site ? new URL('/', site) : new URL('/', url)).toString().replace(/\/$/, '');
	const allItems = sort(Object.values(dataSources).flatMap((source) => source as Item[])).filter(
		(item) => Boolean(item?.Id && item?.Name && item?.Icon)
	);

	const seenUrls = new Set<string>();
	const urlEntries = allItems
		.map((item) => {
			const itemUrl = `${siteOrigin}${getSlug(item)}`;
			if (seenUrls.has(itemUrl)) return null;
			seenUrls.add(itemUrl);
			const imageUrl = `${SITE.imageBaseUrl}${item.Icon}`;
			return {
				loc: itemUrl,
				imageLoc: imageUrl,
				title: item.Name,
			};
		})
		.filter((entry): entry is { loc: string; imageLoc: string; title: string } => Boolean(entry));

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries
	.map(
		(entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <image:image>
      <image:loc>${escapeXml(entry.imageLoc)}</image:loc>
      <image:title>${escapeXml(entry.title)}</image:title>
      <image:caption>${escapeXml(entry.title)}</image:caption>
    </image:image>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
		},
	});
};
