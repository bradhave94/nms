/**
 * The 16 portal glyphs, in the game's order. Hex digit N is the glyph whose icon is
 * `textures/ui/frontend/icons/update3/portalsymbol.<n>.dds` (tech items MAINT_PORTAL1-16 in
 * src/datav2/Technology.json, "This is glyph N+1 of 16."). Names are the game's own
 * (UI_PORTAL_GLYPH_NAME_L_*); the images in public/images/glyphs/ are the item icons, resized.
 * Kept as a small literal so the on-demand alliance pages don't bundle Technology.json.
 */
export interface PortalGlyph {
	hex: string;
	name: string;
	image: string;
	href: string;
}

const NAMES = [
	'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
	'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
];

export const PORTAL_GLYPHS: PortalGlyph[] = NAMES.map((word, index) => {
	const hex = index.toString(16).toUpperCase();
	return {
		hex,
		name: `Glyph ${word}`,
		image: `/images/glyphs/portal-glyph-${hex.toLowerCase()}.webp`,
		href: `/technology/MAINT_PORTAL${index + 1}/`,
	};
});

export const glyphForHex = (hex: string): PortalGlyph | undefined =>
	PORTAL_GLYPHS[Number.parseInt(hex, 16)];
