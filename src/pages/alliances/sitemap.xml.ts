import type { APIRoute } from 'astro';
import { listApprovedAlliances } from '@utils/alliancesDb';

// Alliance listings are rendered on demand, so the build-time sitemap can't see them.
// This sitemap is listed in sitemap-index.xml via `customSitemaps` in astro.config.mjs.
export const prerender = false;

const escapeXml = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toIsoDate = (value: string): string | undefined => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const GET: APIRoute = async ({ site, url }) => {
	const origin = (site ?? new URL('/', url)).origin;
	// Serve an empty sitemap rather than an error if the database is unreachable.
	const alliances: Awaited<ReturnType<typeof listApprovedAlliances>> = await listApprovedAlliances().catch(
		() => [],
	);

	const entries = alliances.map((alliance) => {
		const loc = `${origin}/alliances/${encodeURIComponent(alliance.slug)}/`;
		const lastmod = toIsoDate(alliance.updatedAt);
		return `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
	});

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>\n`;
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
		},
	});
};
