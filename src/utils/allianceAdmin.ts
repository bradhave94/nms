/** Cookie session for the alliance moderation page, keyed off ALLIANCES_ADMIN_TOKEN. */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { ALLIANCES_ADMIN_TOKEN } from 'astro:env/server';

const COOKIE_NAME = 'nms_alliance_admin';
const COOKIE_PATH = '/alliances/admin';

// The cookie holds a hash of the token, never the token itself.
const sessionValue = (token: string): string =>
	createHash('sha256').update(`nms-alliances-admin:${token}`).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
};

export const isAdminConfigured = (): boolean => Boolean(ALLIANCES_ADMIN_TOKEN);

export const isAdmin = (cookies: AstroCookies): boolean => {
	const value = cookies.get(COOKIE_NAME)?.value;
	return Boolean(ALLIANCES_ADMIN_TOKEN && value && safeEqual(value, sessionValue(ALLIANCES_ADMIN_TOKEN)));
};

export const logIn = (cookies: AstroCookies, submittedToken: string): boolean => {
	if (!ALLIANCES_ADMIN_TOKEN || !safeEqual(sessionValue(submittedToken), sessionValue(ALLIANCES_ADMIN_TOKEN))) {
		return false;
	}
	cookies.set(COOKIE_NAME, sessionValue(ALLIANCES_ADMIN_TOKEN), {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'strict',
		path: COOKIE_PATH,
		maxAge: 60 * 60 * 24 * 30,
	});
	return true;
};

export const logOut = (cookies: AstroCookies): void => {
	cookies.delete(COOKIE_NAME, { path: COOKIE_PATH });
};
