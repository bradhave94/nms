const FILE_PATHNAME = /\.[a-zA-Z0-9]+$/;

/** Add a trailing slash to a page path. Leave `/` and file paths unchanged. */
export const ensureTrailingSlashPath = (pathname: string): string => {
	if (!pathname || pathname === '/') return pathname || '/';
	if (FILE_PATHNAME.test(pathname)) return pathname;
	return pathname.endsWith('/') ? pathname : `${pathname}/`;
};

/** Add a trailing slash to a page URL or path. File URLs stay unchanged. */
export const ensureTrailingSlashUrl = (href: string): string => {
	const url = new URL(href, 'https://nomansskyrecipes.com');
	url.pathname = ensureTrailingSlashPath(url.pathname);
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) {
		return url.href;
	}
	return `${url.pathname}${url.search}${url.hash}`;
};
