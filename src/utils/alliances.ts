/** Alliance directory model and validation. Shared by the pages and the DB layer. */
import galaxyData from '../data/galaxies.json' with { type: 'json' };

export const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Switch', 'Mac'] as const;

export const FOCUSES = [
	'Exploration',
	'Building',
	'Cataloguing',
	'Trading',
	'Combat',
	'Roleplay',
	'Farming',
	'Photography',
	'Social',
	'New players',
] as const;

export type Galaxy = { number: number; name: string; reachable: boolean };

/** All 256 galaxies in travel order (scripts/fetch-galaxies.mjs). Only 1–255 are reachable in normal play. */
export const GALAXIES: Galaxy[] = galaxyData.galaxies;
const GALAXY_BY_NAME = new Map(GALAXIES.map((galaxy) => [galaxy.name.toLowerCase(), galaxy]));

export const findGalaxy = (name: string): Galaxy | undefined => GALAXY_BY_NAME.get(name.trim().toLowerCase());

export const ALLIANCE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type AllianceStatus = (typeof ALLIANCE_STATUSES)[number];

// The 20 main colours of the in-game banner palette (bannercustomisationdata, game 7.00).
// Names are descriptive; the game doesn't label every slot.
export const ALLIANCE_COLOURS = [
	{ hex: '#c12a2a', name: 'Red' },
	{ hex: '#ff9e00', name: 'Orange' },
	{ hex: '#f2c700', name: 'Yellow' },
	{ hex: '#25cc6c', name: 'Green' },
	{ hex: '#59dbc4', name: 'Cyan' },
	{ hex: '#3591e6', name: 'Blue' },
	{ hex: '#953fb4', name: 'Purple' },
	{ hex: '#ea5fb7', name: 'Pink' },
	{ hex: '#ffffff', name: 'White' },
	{ hex: '#4c4c4c', name: 'Grey' },
	{ hex: '#8c1313', name: 'Dark red' },
	{ hex: '#9d4415', name: 'Dark orange' },
	{ hex: '#c99225', name: 'Dark yellow' },
	{ hex: '#07863c', name: 'Dark green' },
	{ hex: '#007578', name: 'Dark cyan' },
	{ hex: '#1b63a5', name: 'Dark blue' },
	{ hex: '#771fc1', name: 'Dark purple' },
	{ hex: '#a63361', name: 'Dark pink' },
	{ hex: '#aaaaaa', name: 'Light grey' },
	{ hex: '#000000', name: 'Black' },
] as const;

export const DEFAULT_ALLIANCE_COLOR = '#3591e6';
const COLOUR_HEXES = new Set<string>(ALLIANCE_COLOURS.map((colour) => colour.hex));
const MAX_FOCUSES = 4;

// Static routes under /alliances/ that a generated slug must not shadow.
const RESERVED_SLUGS = new Set(['submit', 'admin']);

export type AllianceInput = {
	name: string;
	tag: string;
	description: string;
	galaxy: string;
	region: string;
	joinSystem: string;
	portalGlyphs: string;
	platforms: string[];
	languages: string;
	focuses: string[];
	color: string;
	discordUrl: string;
	websiteUrl: string;
	contact: string;
};

export type Alliance = AllianceInput & {
	id: number;
	slug: string;
	status: AllianceStatus;
	createdAt: string;
	updatedAt: string;
	approvedAt: string | null;
};

export type AllianceFieldErrors = Partial<Record<keyof AllianceInput, string>>;

export type ValidationResult =
	| { ok: true; value: AllianceInput }
	| { ok: false; value: AllianceInput; errors: AllianceFieldErrors };

export const EMPTY_ALLIANCE_INPUT: AllianceInput = {
	name: '',
	tag: '',
	description: '',
	galaxy: 'Euclid',
	region: '',
	joinSystem: '',
	portalGlyphs: '',
	platforms: [],
	languages: 'English',
	focuses: [],
	color: DEFAULT_ALLIANCE_COLOR,
	discordUrl: '',
	websiteUrl: '',
	contact: '',
};

/** Collapse whitespace and strip control characters from single-line text. */
const cleanLine = (value: unknown): string =>
	String(value ?? '')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

/** Keep paragraph breaks in long text, but no more than one blank line in a row. */
const cleanMultiline = (value: unknown): string =>
	String(value ?? '')
		.replace(/\r\n?/g, '\n')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

/** Portal addresses are 12 hex digits; players often type them with spaces or dashes. */
export const normalizePortalGlyphs = (value: unknown): string =>
	String(value ?? '').replace(/[\s-]/g, '').toUpperCase();

export const formatPortalGlyphs = (glyphs: string): string =>
	glyphs.match(/.{1,4}/g)?.join(' ') ?? glyphs;

export const slugify = (name: string): string => {
	const slug = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/æ/g, 'ae')
		.replace(/ø/g, 'o')
		.replace(/ß/g, 'ss')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/g, '');
	if (!slug) return 'alliance';
	return RESERVED_SLUGS.has(slug) ? `${slug}-alliance` : slug;
};

const parseHttpsUrl = (value: string): URL | undefined => {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url : undefined;
	} catch {
		return undefined;
	}
};

const DISCORD_INVITE_HOSTS = new Set(['discord.gg', 'discord.com', 'www.discord.com', 'discordapp.com']);

export const isDiscordInvite = (value: string): boolean => {
	const url = parseHttpsUrl(value);
	if (!url || !DISCORD_INVITE_HOSTS.has(url.hostname)) return false;
	return url.hostname === 'discord.gg' ? url.pathname.length > 1 : url.pathname.startsWith('/invite/');
};

const pickAllowed = (values: string[], allowed: readonly string[]): string[] =>
	allowed.filter((option) => values.includes(option));

/** Read a submitted form into an AllianceInput without validating it. */
export const allianceInputFromForm = (form: FormData): AllianceInput => ({
	name: cleanLine(form.get('name')),
	tag: cleanLine(form.get('tag')),
	description: cleanMultiline(form.get('description')),
	galaxy: cleanLine(form.get('galaxy')),
	region: cleanLine(form.get('region')),
	joinSystem: cleanLine(form.get('joinSystem')),
	portalGlyphs: normalizePortalGlyphs(form.get('portalGlyphs')),
	platforms: pickAllowed(form.getAll('platforms').map(String), PLATFORMS),
	languages: cleanLine(form.get('languages')),
	focuses: pickAllowed(form.getAll('focuses').map(String), FOCUSES),
	color: cleanLine(form.get('color')).toLowerCase(),
	discordUrl: cleanLine(form.get('discordUrl')),
	websiteUrl: cleanLine(form.get('websiteUrl')),
	contact: cleanLine(form.get('contact')),
});

const lengthError = (label: string, value: string, min: number, max: number): string | undefined => {
	if (value.length < min) return min === 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`;
	if (value.length > max) return `${label} must be ${max} characters or fewer.`;
	return undefined;
};

export const validateAllianceInput = (input: AllianceInput): ValidationResult => {
	const errors: AllianceFieldErrors = {};
	const value: AllianceInput = { ...input, color: COLOUR_HEXES.has(input.color) ? input.color : DEFAULT_ALLIANCE_COLOR };

	// In-game limits: names up to 31 characters; tags exactly 4 of A–Z, 0–9, space, _ or -.
	const nameError = lengthError('Alliance name', value.name, 2, 31);
	if (nameError) errors.name = nameError;
	if (value.tag && !/^[A-Za-z0-9 _-]{4}$/.test(value.tag)) {
		errors.tag = 'Tags are exactly 4 characters: letters, numbers, spaces, _ or -.';
	}
	const descriptionError = lengthError('Description', value.description, 20, 1000);
	if (descriptionError) errors.description = descriptionError;
	const galaxy = findGalaxy(value.galaxy);
	if (galaxy) value.galaxy = galaxy.name;
	else errors.galaxy = value.galaxy ? 'Choose a galaxy from the list.' : 'Galaxy is required.';
	if (value.region.length > 60) errors.region = 'Region must be 60 characters or fewer.';
	const joinSystemError = lengthError('Station system', value.joinSystem, 1, 60);
	if (joinSystemError) errors.joinSystem = joinSystemError;
	if (value.portalGlyphs && !/^[0-9A-F]{12}$/.test(value.portalGlyphs)) {
		errors.portalGlyphs = 'A portal address is 12 characters, using 0–9 and A–F.';
	}
	if (value.languages.length > 60) errors.languages = 'Languages must be 60 characters or fewer.';
	if (value.focuses.length > MAX_FOCUSES) errors.focuses = `Pick up to ${MAX_FOCUSES}.`;
	if (value.discordUrl && !isDiscordInvite(value.discordUrl)) {
		errors.discordUrl = 'Use a Discord invite link, like https://discord.gg/abc123.';
	}
	if (value.websiteUrl && (!parseHttpsUrl(value.websiteUrl) || value.websiteUrl.length > 200)) {
		errors.websiteUrl = 'Use a full https:// link.';
	}
	const contactError = lengthError('Contact', value.contact, 2, 300);
	if (contactError) errors.contact = contactError;

	return Object.keys(errors).length > 0 ? { ok: false, value, errors } : { ok: true, value };
};

/** Validate prepared listings (e.g. starter seeds). Only show a language where one is given. */
export const validatedAllianceInputs = (listings: Array<Partial<AllianceInput>>): AllianceInput[] =>
	listings.map((listing) => {
		const result = validateAllianceInput({ ...EMPTY_ALLIANCE_INPUT, languages: '', ...listing });
		if (!result.ok) throw new Error(`Invalid alliance listing ${listing.name}: ${JSON.stringify(result.errors)}`);
		return result.value;
	});
