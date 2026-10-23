// The Worker bindings this site uses (wrangler.jsonc), typed by hand. The full `wrangler types` runtime types
// replace DOM globals such as Element, which breaks the browser scripts, so only the D1 surface we call is declared.
interface D1Result<T> {
	results: T[];
}
interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

/** The `send_email` binding's structured send (https://developers.cloudflare.com/email-service/api/send-emails/workers-api/). */
interface SendEmail {
	send(message: { to: string; from: string | { email: string; name?: string }; subject: string; text?: string; html?: string }): Promise<{
		messageId: string;
	}>;
}

declare module 'cloudflare:workers' {
	export const env: {
		ALLIANCES_DB?: D1Database;
		ALERT_EMAIL?: SendEmail;
		/** Static assets (dist/client), wrangler.jsonc `assets.binding`. */
		ASSETS?: { fetch(input: Request | URL | string): Promise<Response> };
	};
	/** Keeps the Worker alive after the response until the promise settles. */
	export function waitUntil(promise: Promise<unknown>): void;
}
