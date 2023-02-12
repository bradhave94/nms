/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'warm-gray': colors.warmGray,
				teal: colors.teal,
				sky: colors.sky,
				teal: colors.teal,
				rose: colors.rose,
			},
		},
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/aspect-ratio')],
};
