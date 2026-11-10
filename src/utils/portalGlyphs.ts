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

/** A portal address is 12 hex digits, one per glyph. Accepts spaces, dashes and colons. */
export const normalizePortalAddress = (address: string): string => address.toUpperCase().replace(/[\s:-]/g, '');
export const isPortalAddress = (address: string): boolean => /^[0-9A-F]{12}$/.test(normalizePortalAddress(address));

const COPY_ICON =
	'<svg class="portal-copy-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

/**
 * Static HTML for a portal address: three groups of four glyph tiles (glyph only, with one
 * screen-reader line naming each glyph), then the hex in groups of four and a copy icon button.
 * Phrasing content only (spans, img, button), so it is valid inside a paragraph or table cell.
 * Shared by the alliance pages (PortalAddress.astro) and blog posts (remarkPortalAddress).
 * Styles: src/assets/css/portal-glyphs.css. Copy button: src/scripts/portalCopy.ts.
 */
export const renderPortalAddressHtml = (address: string, options: { size?: 'sm' } = {}): string => {
	const hex = normalizePortalAddress(address);
	if (!isPortalAddress(hex)) throw new Error(`Not a 12-digit hex portal address: "${address}"`);
	const digits = hex.split('');
	const spoken = digits.map((digit) => `${digit} (${glyphForHex(digit)?.name})`).join(', ');
	const groups = [0, 4, 8].map((start) => digits.slice(start, start + 4));
	const tiles = groups
		.map((group) => `<span class="glyph-group">${group
			.map((digit) => `<span class="glyph"><img src="${glyphForHex(digit)?.image}" alt="" width="34" height="34" loading="lazy" decoding="async"></span>`)
			.join('')}</span>`)
		.join('');
	const grouped = groups.map((group) => group.join('')).join(' ');
	const sizeClass = options.size === 'sm' ? ' portal-address--sm' : '';
	return `<span class="portal-address${sizeClass}" data-portal-address="${hex}">`
		+ `<span class="sr-only">Portal address, left to right: ${spoken}.</span>`
		+ `<span class="glyph-groups" aria-hidden="true">${tiles}</span>`
		+ `<span class="portal-hex-line"><span class="portal-hex">${grouped}</span>`
		+ `<button type="button" class="portal-copy" data-copy="${hex}" aria-label="Copy portal address" title="Copy portal address" hidden>${COPY_ICON}</button>`
		+ `<span class="portal-copy-status" role="status"></span></span>`
		+ `</span>`;
};

/**
 * Blog posts: swaps each `portal:<address>` inline code in rendered post HTML for the glyph
 * markup (small tiles inside table cells). Runs on the HTML so it works with any Markdown
 * processor. A malformed address throws, which fails the build.
 */
export const renderPortalCodes = (html: string, source = 'post'): string =>
	html.replace(/<code>portal:([^<]*)<\/code>/g, (_match: string, address: string, offset: number) => {
		if (!isPortalAddress(address)) throw new Error(`${source}: \`portal:${address}\` is not a 12-digit hex portal address`);
		const before = html.slice(0, offset);
		const inTableCell = before.lastIndexOf('<td') > before.lastIndexOf('</td>');
		return renderPortalAddressHtml(address, inTableCell ? { size: 'sm' } : {});
	});
