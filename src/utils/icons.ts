// Icon data names the game's PNGs, but pages show the WebP copy beside each one (a quarter of the
// size; see scripts/icon-webp.mjs). Keep PNG URLs for social previews, structured data, and sitemaps.
export const toWebp = (icon?: string | null): string => (icon ?? '').replace(/\.png$/i, '.webp');
