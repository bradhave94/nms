/**
 * The site's 404 page for Worker-rendered routes.
 *
 * `Astro.rewrite('/404')` does not work on the Worker: 404.astro is prerendered, so the server bundle has no component
 * for it and the rewrite throws (the visitor saw the 404 page with a 500 status). Serve the prerendered 404.html from
 * the static assets instead, with a real 404 status and no edge or browser caching.
 */
import { env } from 'cloudflare:workers';

export async function notFoundResponse(): Promise<Response> {
	const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' };
	try {
		const asset = await env.ASSETS?.fetch('https://assets.local/404');
		if (asset?.ok || asset?.status === 404) {
			return new Response(asset.body, { status: 404, headers });
		}
	} catch (error) {
		console.error('404 page asset failed to load', error);
	}
	return new Response('<!doctype html><title>Page not found</title><h1>Page not found</h1><p><a href="/">Back to No Man\'s Sky Recipes</a></p>', {
		status: 404,
		headers,
	});
}
