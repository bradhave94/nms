import type { APIRoute } from 'astro';
import { incrementAlliancePageViews } from '@utils/alliancesDb';

export const prerender = false;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 80;
const SKIP_SLUGS = new Set(['submit', 'admin', 'views']);

const noStore = { 'Cache-Control': 'no-store' };
const empty = (status = 204) => new Response(null, { status, headers: noStore });

const isSameOrigin = (request: Request): boolean => {
	const url = new URL(request.url);
	const origin = request.headers.get('Origin');
	if (origin) return origin === url.origin;
	return request.headers.get('Sec-Fetch-Site') === 'same-origin';
};

const readSlug = async (request: Request): Promise<string | null> => {
	const contentType = request.headers.get('Content-Type') ?? '';
	try {
		if (contentType.includes('application/json')) {
			const body: unknown = await request.json();
			if (body && typeof body === 'object' && 'slug' in body) return String((body as { slug: unknown }).slug);
			return null;
		}
		const text = (await request.text()).trim();
		if (!text) return null;
		if (contentType.includes('application/x-www-form-urlencoded') || text.includes('=')) {
			return new URLSearchParams(text).get('slug');
		}
		return text;
	} catch {
		return null;
	}
};

export const POST: APIRoute = async ({ request }) => {
	if (!isSameOrigin(request)) return empty(403);
	const slug = (await readSlug(request))?.trim().toLowerCase() ?? '';
	if (!slug || slug.length > MAX_SLUG_LENGTH || !SLUG.test(slug) || SKIP_SLUGS.has(slug)) return empty();
	try {
		await incrementAlliancePageViews(slug);
	} catch (error) {
		console.error('Alliance page view increment failed', error);
	}
	return empty();
};

export const ALL: APIRoute = () =>
	new Response(null, { status: 405, headers: { ...noStore, Allow: 'POST' } });
