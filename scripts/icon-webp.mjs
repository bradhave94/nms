// Item icons come from the game as 128px PNGs (~65KB each). Pages show a WebP copy (~16KB) stored
// beside each PNG; the PNGs stay for social previews, structured data, and the image sitemap.
//
//   node scripts/icon-webp.mjs        write WebP copies that are missing, remove orphaned ones
//   node scripts/icon-webp.mjs --all  rewrite every WebP copy (after replacing PNGs by hand)
import { readdir, unlink } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const ICON_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'items');

const toWebpName = (name) => name.replace(/\.png$/i, '.webp');

export async function writeIconWebps(dir = ICON_DIR, { names, all = false } = {}) {
	const files = await readdir(dir);
	const existing = new Set(files);
	const pngs = files.filter((name) => /\.png$/i.test(name));
	const wanted = new Set(pngs.map(toWebpName));
	const forced = new Set(names ?? []);
	const todo = pngs.filter((name) => all || forced.has(name) || !existing.has(toWebpName(name)));

	let next = 0;
	const worker = async () => {
		while (next < todo.length) {
			const name = todo[next++];
			await sharp(path.join(dir, name)).webp({ quality: 85 }).toFile(path.join(dir, toWebpName(name)));
		}
	};
	await Promise.all(Array.from({ length: availableParallelism() }, worker));

	const orphans = files.filter((name) => name.endsWith('.webp') && !wanted.has(name));
	await Promise.all(orphans.map((name) => unlink(path.join(dir, name))));
	return { written: todo.length, removed: orphans.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { written, removed } = await writeIconWebps(ICON_DIR, { all: process.argv.includes('--all') });
	process.stdout.write(`Wrote ${written} WebP icons, removed ${removed} orphaned.\n`);
}
