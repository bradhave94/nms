/** Push notifications for new alliance submissions and edit requests, sent through ntfy (https://ntfy.sh). */
import { ALLIANCES_NTFY_TOPIC } from 'astro:env/server';
import { waitUntil } from 'cloudflare:workers';
import type { Alliance } from './alliances';

const ADMIN_URL = 'https://nomansskyrecipes.com/alliances/admin/';

/**
 * Best effort: the notification is sent in the background after the response (waitUntil), so a slow ntfy
 * never delays or fails the request. Anyone with the topic name can read it, so only public listing details go out.
 */
const send = async (title: string, body: string, clickUrl: string): Promise<void> => {
	try {
		const response = await fetch(`https://ntfy.sh/${encodeURIComponent(ALLIANCES_NTFY_TOPIC ?? '')}`, {
			method: 'POST',
			headers: { Title: title, Click: clickUrl, Tags: 'rocket', 'Content-Type': 'text/plain; charset=utf-8' },
			body,
			// ntfy can take several seconds to answer from Workers; a 3 s abort cut the body off mid-upload.
			signal: AbortSignal.timeout(20000),
		});
		if (!response.ok) console.error('Alliance notification failed', response.status, await response.text());
	} catch (error) {
		console.error('Alliance notification failed', error);
	}
};

const notify = async (title: string, body: string, clickUrl: string): Promise<void> => {
	if (!ALLIANCES_NTFY_TOPIC) return;
	waitUntil(send(title, body, clickUrl));
};

export const notifyNewSubmission = (alliance: Alliance): Promise<void> =>
	notify(`New alliance: ${alliance.name}`, `${alliance.galaxy} · ${alliance.joinSystem}\nTap to review.`, ADMIN_URL);

export const notifyEditRequest = (allianceName: string, changedLabels: string[]): Promise<void> =>
	notify(
		`Edit requested: ${allianceName}`,
		`${changedLabels.length ? `Changes: ${changedLabels.join(', ')}` : 'Note only, no field changes'}\nTap to review.`,
		`${ADMIN_URL}?view=edits`
	);
