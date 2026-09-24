/** Push notification for new alliance submissions, sent through ntfy (https://ntfy.sh). */
import { ALLIANCES_NTFY_TOPIC } from 'astro:env/server';
import type { Alliance } from './alliances';

const ADMIN_URL = 'https://nomansskyrecipes.com/alliances/admin/';

/**
 * Best effort: a slow or failed notification never blocks the submission.
 * Anyone with the topic name can read it, so only public listing details go out.
 */
export const notifyNewSubmission = async (alliance: Alliance): Promise<void> => {
	if (!ALLIANCES_NTFY_TOPIC) return;
	try {
		await fetch(`https://ntfy.sh/${encodeURIComponent(ALLIANCES_NTFY_TOPIC)}`, {
			method: 'POST',
			headers: {
				Title: `New alliance: ${alliance.name}`,
				Click: ADMIN_URL,
				Tags: 'rocket',
			},
			body: `${alliance.galaxy} · ${alliance.joinSystem}\nTap to review.`,
			signal: AbortSignal.timeout(3000),
		});
	} catch (error) {
		console.error('Alliance submission notification failed', error);
	}
};
