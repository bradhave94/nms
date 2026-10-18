// Cleans display text in the game data as it is imported (src/datav2/*.json), without touching the files:
// they are hash-checked against the extractor manifest (pnpm data:check), so fixes live here.
// - Template names ("%name% Implant", "-null- Figurine"): fixed per item id.
// - Sentences in descriptions that contain an unfilled token ("%NAME%", "%TECH_DESC%"): dropped.
// - Quoted titles that start lower-case, and title-cased roman numerals ("Mark Iv" -> "Mark IV").
// minimal Vite plugin shape (the vite package's types aren't a direct dependency)
type Plugin = { name: string; enforce?: 'pre' | 'post'; transform?: (code: string, id: string) => { code: string; map: null } | null };

// Items whose name is an unfilled template, keyed by id so a future "%name%" item isn't silently mislabelled.
const NAME_BY_ID: Record<string, string> = {
	U_TECHBOX_CORE: 'Pre-packaged Technology Unit',
	U_TECHBOX_ALIEN: 'Technology Implant',
	U_TECHPACK_CORE: 'Technology Package',
	U_TECHPACK_ALIE: 'Technology Node',
	BONE_TEMP: 'Fossil Exhibit',
	BOBBLE_NULL: 'Traveller Figurine',
};

const ROMAN = /^(X{0,3})(IX|IV|V?I{0,3})$/;

export function cleanName(name: string, id?: string): string {
	if (id && NAME_BY_ID[id] && /%name%|-null-/.test(name)) return NAME_BY_ID[id];
	let out = name.replace(/%name%\s*/g, '').replace(/-null-/g, 'Traveller');
	// a quoted title that starts lower-case, at the start or after a space: "\"built to Last\" Poster", "Title: 'the Seeker'"
	out = out.replace(/(^|\s)(["'“‘])([a-z])/g, (_, pre: string, q: string, c: string) => pre + q + c.toUpperCase());
	// roman numerals the data title-cases ("Botanical Pod Ii", "Mark Iv", "Resbur Xiii"): whole words that are valid numerals
	out = out.replace(/\b[IVX][ivx]+\b/g, (m) => (ROMAN.test(m.toUpperCase()) ? m.toUpperCase() : m));
	return out.replace(/\s{2,}/g, ' ').trim();
}

// A sentence or line that contains an unfilled token ("salvaged from wreck of the %NAME%.") is dropped whole;
// blanking just the token left broken sentences ("salvaged from wreck of the .").
const TOKEN = /%[A-Za-z_]+%/;
export function cleanDescription(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			if (!TOKEN.test(line)) return line;
			const kept = line.split(/(?<=[.!?])\s+/).filter((sentence) => !TOKEN.test(sentence));
			return kept.join(' ');
		})
		.join('\n')
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
			if (key === 'Name' && typeof v === 'string') out[key] = cleanName(v, typeof (value as { Id?: unknown }).Id === 'string' ? (value as { Id: string }).Id : undefined);
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
