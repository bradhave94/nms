// Writes src/data/image-sizes.json: width/height of every PNG, JPEG and WebP in public/ (WebP copies of item icons skipped),
// keyed by URL path. Layout.astro reads it for og:image:width/height. Reading the files at render time instead made
// Vercel's file tracer copy all of public/ into the on-demand function (over its 250 MB limit).
// Runs at the start of every build (astro.config.mjs) and by hand: node scripts/image-sizes.mjs
import { openSync, readSync, closeSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const OUT_FILE = path.join(ROOT, 'src', 'data', 'image-sizes.json');

// PNG, WebP or JPEG header -> [width, height] (no image library)
export function parseImageSize(buf) {
	if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
	if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
		const chunk = buf.toString('ascii', 12, 16);
		if (chunk === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
		if (chunk === 'VP8L') { const bits = buf.readUInt32LE(21); return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)]; }
		if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
	}
	if (buf[0] === 0xff && buf[1] === 0xd8) {
		let i = 2;
		while (i + 9 < buf.length) {
			if (buf[i] !== 0xff) { i++; continue; }
			const m = buf[i + 1];
			if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
			i += 2 + buf.readUInt16BE(i + 2);
		}
	}
	return null;
}

function head(file, n = 64) {
	const fd = openSync(file, 'r'); const buf = Buffer.alloc(n);
	try { return buf.subarray(0, readSync(fd, buf, 0, n, 0)); } finally { closeSync(fd); }
}

export function writeImageSizes(publicDir = PUBLIC_DIR, outFile = OUT_FILE) {
	const sizes = {};
	const walk = (dir) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) { walk(p); continue; }
			const ext = path.extname(e.name).toLowerCase();
			if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;
			const url = '/' + path.relative(publicDir, p).split(path.sep).join('/');
			if (ext === '.webp' && url.startsWith('/images/items/')) continue;
			const size = parseImageSize(ext === '.jpg' || ext === '.jpeg' ? readFileSync(p) : head(p));
			if (size) sizes[url] = size;
		}
	};
	walk(publicDir);
	const sorted = Object.fromEntries(Object.keys(sizes).sort().map((k) => [k, sizes[k]]));
	const json = JSON.stringify(sorted) + '\n';
	let old = ''; try { old = readFileSync(outFile, 'utf8'); } catch { /* first run */ }
	if (json !== old) writeFileSync(outFile, json);
	return { count: Object.keys(sorted).length, changed: json !== old };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { count, changed } = writeImageSizes();
	process.stdout.write(`image-sizes: ${count} images${changed ? ' (updated)' : ''}
`);
}
