/// <reference types="astro/client" />

interface NitroAdsApi {
	createAd: (id: string, options?: Record<string, unknown>) => unknown;
	addUserToken: (...args: unknown[]) => void;
	queue: unknown[];
	loaded?: boolean;
}

interface Window {
	nitroAds: NitroAdsApi;
}
