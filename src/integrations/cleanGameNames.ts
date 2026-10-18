// Cleans display text in the game data as it is imported (src/datav2/*.json), without touching the files:
// they are hash-checked against the extractor manifest (pnpm data:check), so fixes live here.
// - Unfilled localisation tokens: "%name% Implant", "Pre-packaged %name% Unit", "%name% Exhibit", "-null- Figurine".
// - Description placeholders: "%TECH_DESC%", "%CRE_DESC%".
// - Quoted titles that start lower-case: "\"built to Last\" Poster" -> "\"Built to Last\" Poster".
import type { Plugin } from 'vite';

const NAME_TOKENS: [RegExp, string][] = [
	[/^%name% Exhibit$/, 'Fossil Exhibit'],
	[/%name%/g, 'Technology'],
	[/-null-/g, 'Traveller'],
];

export function cleanName(name: string): string {
	let out = name;
	for (const [re, value] of NAME_TOKENS) out = out.replace(re, value);
	// capitalise the first letter inside a leading quote
	out = out.replace(/^(["'“‘])([a-z])/, (_, q: string, c: string) => q + c.toUpperCase());
	return out.replace(/\s{2,}/g, ' ').trim();
}

export function cleanDescription(text: string): string {
	return text
		.replace(/%[A-Z_]+%/g, '')
		.replace(/-null-/g, 'Traveller')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const TEXT_KEYS = new Set(['Description', 'AltDescription']);

function walk(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(walk);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
			if (key === 'Name' && typeof v === 'string') out[key] = cleanName(v);
			else if (TEXT_KEYS.has(key) && typeof v === 'string') out[key] = cleanDescription(v);
			else out[key] = walk(v);
		}
		return out;
	}
	return value;
}

/** Sort key for names: leading quotes and punctuation don't count, and names starting with a digit go last. */
export function nameSortKey(name: string): string {
	const bare = name.replace(/^[^A-Za-z0-9]+/, '');
	return (/^[0-9]/.test(bare) ? '~' : '') + bare.toLowerCase();
}

export default function cleanGameNames(): Plugin {
	return {
		name: 'nms-clean-game-names',
		enforce: 'pre',
		transform(code, id) {
			if (!/[\\/]src[\\/]datav2[\\/][^\\/]+\.json(\?.*)?$/.test(id)) return null;
			try {
				return { code: JSON.stringify(walk(JSON.parse(code))), map: null };
			} catch {
				return null;
			}
		},
	};
}
