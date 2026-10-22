/**
 * Alerts for new alliance submissions and edit requests. Sent by email through the Worker's ALERT_EMAIL
 * `send_email` binding (Cloudflare Email Routing on subnauticadatabase.com) to the verified address in
 * ALLIANCES_ALERT_EMAIL. The old ntfy (https://ntfy.sh) path still runs if ALLIANCES_NTFY_TOPIC is set, but it is left
 * unset: ntfy's anonymous quota is per IP and Workers share egress IPs, so it answers 429.
 */
import { ALLIANCES_ALERT_EMAIL, ALLIANCES_NTFY_TOPIC } from 'astro:env/server';
import { env, waitUntil } from 'cloudflare:workers';
import type { Alliance } from './alliances';

const ADMIN_URL = 'https://nomansskyrecipes.com/alliances/admin/';
const FROM = { email: 'alerts@subnauticadatabase.com', name: 'NMS Recipes alliances' };

const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const sendEmail = async (title: string, body: string, clickUrl: string): Promise<void> => {
	try {
		const result = await env.ALERT_EMAIL!.send({
			to: ALLIANCES_ALERT_EMAIL!,
			from: FROM,
			subject: title,
			text: `${body}\n\n${clickUrl}`,
			html: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p><a href="${escapeHtml(clickUrl)}">${escapeHtml(clickUrl)}</a></p>`,
		});
		// eslint-disable-next-line no-console -- one line per alert so a send can be confirmed in Workers Logs
		console.log('Alliance email alert sent', result.messageId);
	} catch (error) {
		const { code, message } = error as { code?: string; message?: string };
		console.error('Alliance email alert failed', code, message ?? error);
	}
};

const sendNtfy = async (title: string, body: string, clickUrl: string): Promise<void> => {
	try {
		const response = await fetch(`https://ntfy.sh/${encodeURIComponent(ALLIANCES_NTFY_TOPIC ?? '')}`, {
			method: 'POST',
			headers: { Title: title, Click: clickUrl, Tags: 'rocket', 'Content-Type': 'text/plain; charset=utf-8' },
			body,
			signal: AbortSignal.timeout(20000),
		});
		if (!response.ok) console.error('Alliance notification failed', response.status, await response.text());
	} catch (error) {
		console.error('Alliance notification failed', error);
	}
};

/** Best effort and in the background after the response (waitUntil), so a slow or failing send never affects the request. */
const notify = async (title: string, body: string, clickUrl: string): Promise<void> => {
	if (env.ALERT_EMAIL && ALLIANCES_ALERT_EMAIL) waitUntil(sendEmail(title, body, clickUrl));
	if (ALLIANCES_NTFY_TOPIC) waitUntil(sendNtfy(title, body, clickUrl));
};

export const notifyNewSubmission = (alliance: Alliance): Promise<void> =>
	notify(`New alliance: ${alliance.name}`, `${alliance.galaxy} · ${alliance.joinSystem}\nTap to review.`, ADMIN_URL);

export const notifyEditRequest = (allianceName: string, changedLabels: string[]): Promise<void> =>
	notify(
		`Edit requested: ${allianceName}`,
		`${changedLabels.length ? `Changes: ${changedLabels.join(', ')}` : 'Note only, no field changes'}\nTap to review.`,
		`${ADMIN_URL}?view=edits`
	);
