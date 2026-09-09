import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
	collectRouteEligibleItems,
	isSupportedItemRoute,
} from '../src/utils/routeEligible.ts';

const routeFor = (item) => {
	const slug = String(item.Slug ?? '').replace(/^\/+/, '');
	if (slug.startsWith('creatures/shop/')) {
		return `/creatures/arena#pet-shop-${slug.slice('creatures/shop/'.length)}`;
	}
	return `/${slug}`;
};

const creatures = JSON.parse(await readFile('src/datav2/Creatures.json', 'utf8'));
const currentEntries = collectRouteEligibleItems({ Creatures: creatures }, routeFor);
const currentIds = new Set(currentEntries.map(({ item }) => item.Id));

assert(currentIds.has('DIPLO_PET'), 'nested creature species must be route eligible');
assert(currentIds.has('SPEC_PB_EGG01'), 'pet-shop entries must keep their hub anchor');
assert(!currentIds.has('ATTACK_NORM'), 'move metadata must not become an item card');
assert(!currentIds.has('CargoCylinder'), 'accessory metadata must not become an item card');
assert(currentEntries.every(({ item, url }) => item.Name && item.Icon && isSupportedItemRoute(url)));

const futureSources = {
	Items: [
		{ Id: 'FUTURE_BASE', Name: 'Future Room', Icon: 'FUTURE_BASE.png', Slug: 'buildings/FUTURE_BASE' },
		{
			Id: 'FUTURE_ROOM_ALIAS',
			Name: 'Future Room',
			Icon: 'FUTURE_ROOM_ALIAS.png',
			Slug: 'buildings/FUTURE_ROOM_ALIAS',
			SpaceBaseVariantOf: ['FUTURE_BASE'],
		},
		{ Id: 'FUTURE_REWARD', Name: 'Future Reward', Icon: 'FUTURE_REWARD.png', Slug: 'other/FUTURE_REWARD' },
		{
			Id: 'FUTURE_REWARD_VARIANT',
			Name: 'Future Reward',
			Icon: 'FUTURE_REWARD_VARIANT.png',
			Slug: 'other/FUTURE_REWARD_VARIANT',
			RewardVariantOf: 'FUTURE_REWARD',
		},
	],
	Creatures: {
		Species: [
			{ Id: 'FUTURE_SPECIES', Name: 'Future Species', Icon: 'FUTURE_SPECIES.png', Slug: 'creatures/FUTURE_SPECIES' },
		],
		BattleMoves: [
			{ Id: 'FUTURE_MOVE', Name: 'Future Move', Slug: 'creatures/moves/FUTURE_MOVE' },
		],
		PetAccessories: [
			{ Id: 'FutureAccessory', Name: 'Future Accessory', Slug: 'creatures/accessories/FutureAccessory' },
		],
	},
};
const futureEntries = collectRouteEligibleItems(futureSources, routeFor);
assert.deepEqual(
	futureEntries.map(({ item }) => item.Id),
	['FUTURE_BASE', 'FUTURE_REWARD', 'FUTURE_SPECIES'],
	'future nested data must preserve pages and collapse explicit aliases',
);
assert.deepEqual(
	futureEntries.find(({ item }) => item.Id === 'FUTURE_BASE').aliases.map((item) => item.Id),
	['FUTURE_ROOM_ALIAS'],
);
assert.deepEqual(
	futureEntries.find(({ item }) => item.Id === 'FUTURE_REWARD').aliases.map((item) => item.Id),
	['FUTURE_REWARD_VARIANT'],
);

const updateOnlyAlias = collectRouteEligibleItems(
	[
		{
			Id: 'FUTURE_ROOM_ALIAS',
			Name: 'Future Room',
			Icon: 'FUTURE_ROOM_ALIAS.png',
			Slug: 'buildings/FUTURE_ROOM_ALIAS',
			SpaceBaseVariantOf: ['FUTURE_BASE'],
		},
		{ Id: 'FUTURE_NEW', Name: 'Future New', Icon: 'FUTURE_NEW.png', Slug: 'products/FUTURE_NEW' },
	],
	routeFor,
	futureEntries.flatMap(({ item, aliases }) => [item, ...aliases]),
);
assert.deepEqual(updateOnlyAlias.map(({ item }) => item.Id), ['FUTURE_NEW']);

assert(isSupportedItemRoute('/creatures/arena#pet-shop-FUTURE_EGG'));
assert(!isSupportedItemRoute('/creatures/moves/FUTURE_MOVE'));
assert(!isSupportedItemRoute('/creatures/accessories/FutureAccessory'));
assert(!isSupportedItemRoute('/item/FUTURE_ITEM'));

process.stdout.write(`Verified ${currentEntries.length} current route-eligible entries and future synthetic traversal/alias cases.\n`);
