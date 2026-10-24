import type { AstroIntegration } from 'astro';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Workers static assets (`html_handling: auto-trailing-slash`) answer `/refining` with a 307 to
// `/refining/`. A 307 is temporary, so Google keeps both URLs and splits their impressions. This adds
// permanent 308 rules to the built `_redirects` for every prerendered page, so the no-slash form
// redirects permanently to the canonical slash form before the asset layer's 307 kicks in.
//
// Workers allow 2,000 static and 100 dynamic `_redirects` rules. Folders whose children are all
// pages get one placeholder rule (`/raw/:id /raw/:id/ 308`); everything else gets one static rule
// per page. Placeholders match a whole segment only, so `/raw/:id` never matches `/raw/X/`.
const MAX_STATIC = 2000;
const MAX_DYNAMIC = 100;
// Folders with fewer pages than this get static rules instead of a placeholder.
const PLACEHOLDER_MIN_PAGES = 10;

const isPageDir = (dir: string) => existsSync(join(dir, 'index.html'));

export default function trailingSlashRedirects(): AstroIntegration {
	return {
		name: 'trailing-slash-redirects',
		hooks: {
			'astro:build:done': ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const redirectsFile = join(root, '_redirects');
				const existing = existsSync(redirectsFile) ? readFileSync(redirectsFile, 'utf8') : '';
				const rules = existing
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith('#'))
					.map((line) => line.split(/\s+/)[0]);
				const taken = new Set(rules);
				let staticCount = rules.filter((source) => !/[:*]/.test(source)).length;
				let dynamicCount = rules.length - staticCount;

				const staticRules: string[] = [];
				const dynamicRules: string[] = [];
				const addStatic = (path: string) => {
					if (taken.has(path) || taken.has(`${path}/`)) return;
					taken.add(path);
					staticRules.push(`${path} ${path}/ 308`);
				};

				// Walks page folders. `prefix` is the URL path of `folder` (no trailing slash).
				const walk = (folder: string, prefix: string) => {
					const entries = readdirSync(folder, { withFileTypes: true });
					const childDirs = entries.filter((entry) => entry.isDirectory());
					const childPages = childDirs.filter((entry) => isPageDir(join(folder, entry.name)));
					const childFiles = entries.filter((entry) => entry.isFile() && entry.name !== 'index.html');
					// A placeholder is safe only when every child segment is a page folder: no files
					// (e.g. /calculator/planner-data.json) and no non-page folders it would catch.
					// An existing placeholder (e.g. /creatures/species/:id -> /creatures/:id/) already owns these.
					const ownedElsewhere = taken.has(`${prefix}/:id`) || taken.has(`${prefix}/*`);
					const placeholderSafe =
						!ownedElsewhere &&
						prefix !== '' &&
						childPages.length >= PLACEHOLDER_MIN_PAGES &&
						childFiles.length === 0 &&
						childPages.length === childDirs.length;
					if (placeholderSafe) {
						taken.add(`${prefix}/:id`);
						dynamicRules.push(`${prefix}/:id ${prefix}/:id/ 308`);
					}
					for (const child of childPages) {
						const path = `${prefix}/${child.name}`;
						if (!placeholderSafe && !ownedElsewhere) addStatic(path);
						walk(join(folder, child.name), path);
					}
				};
				// Skip build output that isn't a page tree.
				const skip = new Set(['_astro', 'images', 'fonts']);
				for (const entry of readdirSync(root, { withFileTypes: true })) {
					if (!entry.isDirectory() || skip.has(entry.name)) continue;
					const folder = join(root, entry.name);
					if (!isPageDir(folder)) continue;
					addStatic(`/${entry.name}`);
					walk(folder, `/${entry.name}`);
				}

				staticCount += staticRules.length;
				dynamicCount += dynamicRules.length;
				if (staticCount > MAX_STATIC || dynamicCount > MAX_DYNAMIC) {
					throw new Error(
						`_redirects over the Workers limits: ${staticCount}/${MAX_STATIC} static, ${dynamicCount}/${MAX_DYNAMIC} dynamic.`
					);
				}

				// Static rules go above the first placeholder or splat rule (Workers matches static rules
				// faster there); placeholder rules go at the end.
				const lines = existing.replace(/\n*$/, '').split('\n');
				const firstDynamic = lines.findIndex((line) => {
					const source = line.trim().split(/\s+/)[0] ?? '';
					return !line.trim().startsWith('#') && /[:*]/.test(source);
				});
				const insertAt = firstDynamic === -1 ? lines.length : firstDynamic;
				const comment = '# Permanent no-slash -> slash redirects for prerendered pages (src/integrations/trailingSlashRedirects.ts).';
				const output = [
					...lines.slice(0, insertAt),
					comment,
					...staticRules,
					...lines.slice(insertAt),
					comment,
					...dynamicRules,
					'',
				].join('\n');
				writeFileSync(redirectsFile, output);
				logger.info(
					`Added ${staticRules.length} static and ${dynamicRules.length} placeholder trailing-slash redirects (${staticCount} static, ${dynamicCount} dynamic in total).`
				);
			},
		},
	};
}
