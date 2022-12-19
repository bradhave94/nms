export const SITE = {
	name: "No Man's Sky Recipes",

	origin: 'https://astrowind.vercel.app',
	basePathname: '/',

	title: "No Man's Sky Refiner Recipes, Crafting Guide and Cooking Guide",
	description:
		"Looking for one stop shop for all your No Man's Sky needs? Look no more! No Man's Sky Refiner Recipes, Crafting Guide and Cooking Guide",

	googleAnalyticsId: false, // or "G-XXXXXXXXXX",
	googleSiteVerificationId: 'orcPxI47GSa-cRvY11tUe6iGg2IO_RPvnA1q95iEM3M',
};

export const BLOG = {
	disabled: false,
	postsPerPage: 4,

	blog: {
		disabled: false,
		pathname: 'blog', // blog main path, you can change this to "articles" (/articles)
	},

	post: {
		disabled: false,
		pathname: '', // empty for /some-post, value for /pathname/some-post
	},

	category: {
		disabled: false,
		pathname: 'category', // set empty to change from /category/some-category to /some-category
	},

	tag: {
		disabled: false,
		pathname: 'tag', // set empty to change from /tag/some-tag to /some-tag
	},
};
