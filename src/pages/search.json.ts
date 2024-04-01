import type { APIRoute } from 'astro';

import products from '@data/Products.json';
import raw from '@data/RawMaterials.json';
import cooking from '@data/Cooking.json';
import curiosities from '@data/Curiosities.json';
import conTech from '@data/ConstructedTechnology.json';
import tech from '@data/Technology.json';
import buildings from '@data/Buildings.json';
import other from '@data/Others.json';
import trade from '@data/Trade.json';
import { getLabel, getSlug, sort } from '@utils/lookup.js';

const data = sort([...raw, ...products, ...cooking, ...curiosities, ...conTech, ...tech, ...buildings, ...other, ...trade]);

const search = data.map((item) => {
	return {
		id: item.Id,
		name: item.Name,
		type: getLabel(item.Id),
		url: getSlug(item.Id) + item.Id,
	};
});



export const GET: APIRoute = ({ params, request }) => {
	return new Response(
		JSON.stringify({
			body: search,
		})
	);
};
