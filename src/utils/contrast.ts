// Text colour for the game's item colour swatches (refiner/cooking/crafting cells and cards).
// Picks black or white, whichever has the higher WCAG contrast against the swatch, so every
// item name stays readable (>= 4.5:1 for all swatch colours the game uses).

const channel = (value: number): number => {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
	const clean = hex.replace(/^#/, '');
	const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean.slice(0, 6);
	const num = Number.parseInt(full, 16);
	if (!Number.isFinite(num)) return 0;
	return 0.2126 * channel((num >> 16) & 255) + 0.7152 * channel((num >> 8) & 255) + 0.0722 * channel(num & 255);
};

/** `#000` or `#fff`, whichever reads better on the given background colour (hex, with or without #). */
export const readableTextOn = (hex: string | undefined | null): '#000' | '#fff' => {
	if (!hex) return '#fff';
	const l = relativeLuminance(hex);
	const onWhite = 1.05 / (l + 0.05);
	const onBlack = (l + 0.05) / 0.05;
	return onBlack > onWhite ? '#000' : '#fff';
};

/** Inline style for a coloured item swatch: background plus readable text colour. */
export const swatchStyle = (hex: string | undefined | null, fallback = '333333'): string => {
	const colour = (hex || fallback).replace(/^#/, '');
	return `background: #${colour}; color: ${readableTextOn(colour)}`;
};
