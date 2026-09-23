/**
 * Starter listings for the alliance directory: established communities, using only
 * details they publish (wiki pages or official sites, checked 2026-09-23). Entries marked
 * `approved` load live; any others load as pending for review. `contact` holds private
 * moderator notes: sources and anything to verify.
 */
import type { AllianceInput } from './alliances';

export type AllianceSeed = Partial<AllianceInput> &
	Pick<AllianceInput, 'name' | 'description' | 'galaxy' | 'joinSystem' | 'contact'> & {
		/** The community has published its in-game alliance and where to join it (checked 2026-09-23). */
		approved?: boolean;
	};

export const ALLIANCE_SEEDS: AllianceSeed[] = [
	{
		name: 'Alliance of Galactic Travellers',
		approved: true,
		description:
			"A nomadic exploration community with capital regions in several galaxies. AGT's in-game alliance is joined at the space station in the AGT Embassy system, in Euclid's Yihelli Quadrant.",
		galaxy: 'Euclid',
		region: 'Yihelli Quadrant',
		joinSystem: 'AGT Embassy',
		portalGlyphs: '105FF3545C3E',
		focuses: ['Exploration', 'Building', 'Cataloguing', 'Trading'],
		color: '#ff9e00',
		discordUrl: 'https://discord.gg/kdRpmbMmQ3',
		websiteUrl: 'https://www.nms-agt.com/',
		contact:
			'Seeded. Join steps + glyphs: https://nomanssky.fandom.com/wiki/Alliance_of_Galactic_Travellers and https://www.nms-agt.com/events-calendar/2026-09-14-agt-alliance-in-game. Tag and languages not published.',
	},
	{
		name: 'Union of Allied Systems',
		approved: true,
		tag: 'UOAS',
		description:
			"The Xaine's World community's civilization, with regions in every galaxy and a big presence in the first ten. Join the UOAS alliance at the station core of any UAS capital in Euclid, Hilbert Dimension or Eissentam.",
		galaxy: 'Eissentam',
		region: 'Dibadzla',
		joinSystem: 'Xuan Wu',
		focuses: ['Exploration', 'Building', 'Farming', 'Social'],
		color: '#25cc6c',
		discordUrl: 'https://discordapp.com/invite/F4z3Zre',
		websiteUrl: 'https://www.xainesworld.com/no-mans-sky/uas-union-of-allied-systems-civilisation/',
		contact:
			'Seeded. Tag UOAS + join steps from the website. Xuan Wu is the Eissentam capital per https://www.xainesworld.com/no-mans-sky/uas-union-of-allied-systems-civilisation/e-i-s-u-a-s-union-of-allied-systems-civilisation/',
	},
	{
		name: 'Eisvana',
		approved: true,
		description:
			'A civilization that explores and documents its regions of Eissentam and aims to be a safe, inclusive space. Its in-game alliance is joined at the space station in the capital system.',
		galaxy: 'Eissentam',
		region: 'Cuynteto',
		joinSystem: 'EV5-6C Clarity',
		portalGlyphs: '406CA21107FF',
		focuses: ['Exploration', 'Cataloguing', 'Building'],
		color: '#953fb4',
		discordUrl: 'https://discord.gg/Czu3VvjBaa',
		websiteUrl: 'https://eisvana.com',
		contact:
			'Seeded. Alliance note added 2026-09-14 by founder on https://nomanssky.fandom.com/wiki/Eisvana. Capital EV5-6C Clarity is in Cuynteto; glyphs match.',
	},
	{
		name: 'Royal Space Society',
		approved: true,
		description:
			'The largest Spanish-speaking No Man\'s Sky community, set up as a guide and refuge for Spanish-speaking travellers. Active in Euclid, Eissentam, Hilbert Dimension and beyond.',
		galaxy: 'Euclid',
		region: 'Uekenbe Shallows',
		joinSystem: 'Urticalia',
		portalGlyphs: '2141F7EC0D24',
		languages: 'Spanish, English',
		focuses: ['Exploration', 'Social', 'New players'],
		color: '#f2c700',
		websiteUrl: 'https://royalspacesociety.com/',
		contact:
			'Seeded. Capital + glyphs verified on https://nomanssky.fandom.com/wiki/Royal_Space_Society. Approved by moderator 2026-09-23; RSS has not published a join station, so this is their capital. Discord invites differ between wiki and website, so none added.',
	},
	{
		name: 'Galactic Hub',
		approved: true,
		description:
			'The largest and oldest active civilization in No Man\'s Sky, focused on exploration and documentation across a 27-region block of Euclid.',
		galaxy: 'Euclid',
		region: 'Rireith Conflux',
		joinSystem: 'HUB16-205 Bixiann',
		portalGlyphs: '2205D058AC1D',
		focuses: ['Exploration', 'Cataloguing', 'Building'],
		color: '#3591e6',
		discordUrl: 'https://discord.gg/aXuEuG2vmH',
		websiteUrl: 'https://nmsgalactichub.miraheze.org/wiki/Galactic_Hub_Project',
		contact:
			'Seeded. Join at capital station per https://nmsgalactichub.miraheze.org/wiki/Guide:How_to_Join. Glyphs are capital planet Uthmi Beta (/wiki/Uthmi_Beta).',
	},
	{
		name: 'NMSA 905 Hub',
		approved: true,
		description:
			'A PlayStation community holding a "defence ring" at the 905 light-year Sentinel barrier with bases, depots, charted planets and events. The listed system is one of several NMSA 905 alliance stations inside the ring. The alliance HQ is in a purple-star system.',
		galaxy: 'Euclid',
		region: 'Sehaiuri',
		joinSystem: 'NMSA Yellow Black Blue Freighter',
		portalGlyphs: '11890D4597B3',
		platforms: ['PlayStation'],
		focuses: ['Building', 'Exploration', 'Social'],
		color: '#c12a2a',
		websiteUrl: 'https://nomanssky.fandom.com/wiki/NMSA_905_Hub',
		contact:
			'Seeded. Alliance + stations per founder videos https://www.youtube.com/watch?v=z50TOR-syx4 and https://www.youtube.com/watch?v=JL7P2rT1U-4 (HQ glyphs only on screen, ~8:40).',
	},
];

