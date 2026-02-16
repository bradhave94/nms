import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: URL, imageSitemapURL: URL) => `User-agent: *
Allow: /

# AI crawlers - allow for AEO (Answer Engine Optimization)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${sitemapURL.href}
Sitemap: ${imageSitemapURL.href}
`;

export const GET: APIRoute = ({ site, url }) => {
	const base = site ?? new URL('/', url);
	const sitemapURL = new URL('sitemap-index.xml', base);
	const imageSitemapURL = new URL('image-sitemap.xml', base);
	return new Response(getRobotsTxt(sitemapURL, imageSitemapURL), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
