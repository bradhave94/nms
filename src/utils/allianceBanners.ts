/**
 * Communities with their own banner and decal items in the game (BANNER_* / DECAL_*,
 * game 7.00). Kept inline so the alliance pages don't bundle the item catalogues.
 */
type CommunityItem = { name: string; href: string; icon: string };
type CommunityBanners = { aliases: string[]; banner: CommunityItem; decal: CommunityItem };

const item = (name: string, category: 'other' | 'buildings', id: string): CommunityItem => ({
	name,
	href: `/${category}/${id}/`,
	icon: `${id}.png`,
});

const COMMUNITY_BANNERS: CommunityBanners[] = [
	{
		aliases: ['Galactic Hub', 'Galactic Hub Project'],
		banner: item('Galactic Hub Banner', 'other', 'BANNER_HUB'),
		decal: item('Galactic Hub Decal', 'buildings', 'SPEC_DECAL02'),
	},
	{
		aliases: ['Alliance of Galactic Travellers', 'AGT'],
		banner: item('Alliance of Galactic Travellers Banner', 'other', 'BANNER_AGT'),
		decal: item('Alliance of Galactic Travellers Decal', 'buildings', 'DECAL_AGT'),
	},
	{
		aliases: ['Amino Hub'],
		banner: item('Amino Hub Banner', 'other', 'BANNER_AMINO'),
		decal: item('Amino Hub Decal', 'buildings', 'DECAL_AMINO'),
	},
	{
		aliases: ['Café 42', 'Cafe 42', 'NMSCafe'],
		banner: item('Café 42 Banner', 'other', 'BANNER_CAFE'),
		decal: item('Café 42 Decal', 'buildings', 'DECAL_CAFE'),
	},
	{
		aliases: ['Qitanian Empire'],
		banner: item('Qitanian Empire Banner', 'other', 'BANNER_QIT'),
		decal: item('Qitanian Empire Decal', 'buildings', 'DECAL_QIT'),
	},
	{
		aliases: ["No Man's Sky France", "No Man's Sky Francophone", 'NMS Francophone', 'Hub Francophone', 'Le Hub Francophone'],
		banner: item("No Man's Sky France Banner", 'other', 'BANNER_NMS_FR'),
		decal: item("No Man's Sky France Decal", 'buildings', 'DECAL_NMS_FR'),
	},
	{
		aliases: ['Royal Space Society', 'RSS'],
		banner: item('Royal Space Society Banner', 'other', 'BANNER_RSS'),
		decal: item('Royal Space Society Decal', 'buildings', 'DECAL_RSS'),
	},
	{
		aliases: ['OOGC', 'OOGC Interstellar Alliance'],
		banner: item('OOGC Banner', 'other', 'BANNER_OOGC'),
		decal: item('OOGC Decal', 'buildings', 'DECAL_OOGC'),
	},
	{
		aliases: ['United Federation of Travelers', 'United Federation of Travellers', 'UFT'],
		banner: item('United Federation of Travelers Banner', 'other', 'BANNER_UFT'),
		decal: item('United Federation of Travelers Decal', 'buildings', 'DECAL_UFT'),
	},
	{
		aliases: ['NMSCord', 'NMSCord Hub'],
		banner: item('NMSCord Banner', 'other', 'BANNER_NMSCORD'),
		decal: item('NMSCord Decal', 'buildings', 'DECAL_NMSCORD'),
	},
	{
		aliases: ['United Nations 42', 'UN42'],
		banner: item('United Nations 42 Banner', 'other', 'BANNER_UN42'),
		decal: item('United Nations 42 Decal', 'buildings', 'DECAL_UN42'),
	},
	{
		aliases: ['Atlas Foundation'],
		banner: item('Atlas Foundation Banner', 'other', 'BANNER_AF'),
		decal: item('Atlas Foundation Decal', 'buildings', 'DECAL_AF'),
	},
];

const normalise = (name: string): string =>
	name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

const BY_ALIAS = new Map(
	COMMUNITY_BANNERS.flatMap((entry) => entry.aliases.map((alias) => [normalise(alias), entry] as const))
);

/** The community's in-game banner and decal, if the alliance name matches one. */
export const findCommunityBanners = (allianceName: string): Omit<CommunityBanners, 'aliases'> | undefined => {
	const match = BY_ALIAS.get(normalise(allianceName));
	return match && { banner: match.banner, decal: match.decal };
};
