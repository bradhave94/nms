import type { APIRoute } from 'astro';
import { SITE } from '@config';
import { getRouteEligibleCatalog } from '@utils/routeCatalog.js';

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
	const imagesByPage = new Map<string, Array<{ imageLoc: string; title: string }>>();
	for (const { item, url: itemRoute } of getRouteEligibleCatalog()) {
		const loc = `${siteOrigin}${itemRoute.split('#', 1)[0]}`;
		const images = imagesByPage.get(loc) ?? [];
		const imageLoc = `${SITE.imageBaseUrl}${String(item.Icon)}`;
		if (!images.some((image) => image.imageLoc === imageLoc)) {
			images.push({ imageLoc, title: String(item.Name) });
		}
		imagesByPage.set(loc, images);
	}

	const urlEntries = [...imagesByPage.entries()].map(([loc, images]) => ({ loc, images }));

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries
	.map(
		(entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
${entry.images
	.map(
		(image) => `    <image:image>
      <image:loc>${escapeXml(image.imageLoc)}</image:loc>
      <image:title>${escapeXml(image.title)}</image:title>
      <image:caption>${escapeXml(image.title)}</image:caption>
    </image:image>`
	)
	.join('\n')}
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
