import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ImageSize = { width: number; height: number };

const cache = new Map<string, ImageSize | null>();

// Reads width/height from a PNG, WebP or JPEG header (no image library, so it stays out of the server bundle).
const parseImageSize = (buf: Buffer): ImageSize | null => {
	if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}
	if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
		const chunk = buf.toString('ascii', 12, 16);
		if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
		if (chunk === 'VP8L') {
			const bits = buf.readUInt32LE(21);
			return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
		}
		if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
	}
	if (buf[0] === 0xff && buf[1] === 0xd8) {
		let i = 2;
		while (i + 9 < buf.length) {
			if (buf[i] !== 0xff) {
				i++;
				continue;
			}
			const marker = buf[i + 1];
			if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
				return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
			}
			i += 2 + buf.readUInt16BE(i + 2);
		}
	}
	return null;
};

/** Size of an image served from `public/` (absolute URL on this site), or null if unknown. Build time only. */
export const getPublicImageSize = (url: string, siteOrigin: string): ImageSize | null => {
	if (!url.startsWith(`${siteOrigin}/`)) return null;
	const pathname = decodeURIComponent(new URL(url).pathname);
	const cached = cache.get(pathname);
	if (cached !== undefined) return cached;
	let size: ImageSize | null;
	try {
		size = parseImageSize(readFileSync(join(process.cwd(), 'public', pathname)));
	} catch {
		size = null;
	}
	cache.set(pathname, size);
	return size;
};
