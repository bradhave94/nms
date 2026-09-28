/** Push notifications for new alliance submissions and edit requests, sent through ntfy (https://ntfy.sh). */
import { ALLIANCES_NTFY_TOPIC } from 'astro:env/server';
import type { Alliance } from './alliances';

const ADMIN_URL = 'https://nomansskyrecipes.com/alliances/admin/';

/**
 * Best effort: a slow or failed notification never blocks the request.
 * Anyone with the topic name can read it, so only public listing details go out.
 */
const notify = async (title: string, body: string, clickUrl: string): Promise<void> => {
	if (!ALLIANCES_NTFY_TOPIC) return;
	try {
		await fetch(`https://ntfy.sh/${encodeURIComponent(ALLIANCES_NTFY_TOPIC)}`, {
			method: 'POST',
			headers: { Title: title, Click: clickUrl, Tags: 'rocket' },
			body,
			signal: AbortSignal.timeout(3000),
		});
	} catch (error) {
		console.error('Alliance notification failed', error);
	}
};

export const notifyNewSubmission = (alliance: Alliance): Promise<void> =>
	notify(`New alliance: ${alliance.name}`, `${alliance.galaxy} · ${alliance.joinSystem}\nTap to review.`, ADMIN_URL);

export const notifyEditRequest = (allianceName: string, changedLabels: string[]): Promise<void> =>
	notify(
		`Edit requested: ${allianceName}`,
		`${changedLabels.length ? `Changes: ${changedLabels.join(', ')}` : 'Note only, no field changes'}\nTap to review.`,
		`${ADMIN_URL}?view=edits`
	);
