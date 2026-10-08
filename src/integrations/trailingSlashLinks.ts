import type { AstroIntegration } from 'astro';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pages are served at `/path/`, so a link to `/path` costs a 308 redirect plus the page: two billed
// CDN requests per click (and per crawler hop). Source links are written without the slash in many
// places, so this rewrites them in the built HTML instead. A link only gains a slash when a built
// page exists at that path, or it's listed in `extraPaths` (on-demand routes that have no HTML file).
export default function trailingSlashLinks({ extraPaths = [] }: { extraPaths?: string[] } = {}): AstroIntegration {
	return {
		name: 'trailing-slash-links',
		hooks: {
			'astro:build:done': ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const htmlFiles: string[] = [];
				const walk = (folder: string) => {
					for (const entry of readdirSync(folder, { withFileTypes: true })) {
						const full = join(folder, entry.name);
						if (entry.isDirectory()) walk(full);
						else if (entry.name.endsWith('.html')) htmlFiles.push(full);
					}
				};
				walk(root);

				const pagePaths = new Set(extraPaths);
				for (const file of htmlFiles) {
					const rel = relative(root, file).split(sep).join('/');
					if (rel.endsWith('/index.html')) pagePaths.add(`/${rel.slice(0, -'/index.html'.length)}`);
				}

				let rewritten = 0;
				for (const file of htmlFiles) {
					const html = readFileSync(file, 'utf8');
					const next = html.replace(/href="(\/[^"?#]*[^"?#/])([?#][^"]*)?"/g, (match, path: string, suffix = '') => {
						if (!pagePaths.has(path)) return match;
						rewritten++;
						return `href="${path}/${suffix}"`;
					});
					if (next !== html) writeFileSync(file, next);
				}
				logger.info(`Added trailing slashes to ${rewritten} internal links`);
			},
		},
	};
}
