// Image sizes come from src/data/image-sizes.json, written from public/ at the start of every build
// (scripts/image-sizes.mjs). Reading the files here instead made Vercel copy all of public/ into the on-demand function.
import sizes from '../data/image-sizes.json';

export type ImageSize = { width: number; height: number };

const table = sizes as unknown as Record<string, [number, number]>;

/** Size of an image served from `public/` (absolute URL on this site), or null if unknown. */
export const getPublicImageSize = (url: string, siteOrigin: string): ImageSize | null => {
	if (!url.startsWith(`${siteOrigin}/`)) return null;
	const size = table[decodeURIComponent(new URL(url).pathname)];
	return size ? { width: size[0], height: size[1] } : null;
};
