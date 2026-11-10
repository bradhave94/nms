// Copy buttons on portal addresses (renderPortalAddressHtml). Buttons stay hidden where the
// Clipboard API isn't available; the result is announced in the address's role="status" span.
const buttons = document.querySelectorAll<HTMLButtonElement>('.portal-copy');
if (navigator.clipboard) {
	for (const button of buttons) {
		button.hidden = false;
		const status = button.parentElement?.querySelector('.portal-copy-status');
		let timer: ReturnType<typeof setTimeout> | undefined;
		button.addEventListener('click', async () => {
			let message = 'Copied';
			try {
				await navigator.clipboard.writeText(button.dataset.copy ?? '');
			} catch {
				message = "Couldn't copy";
			}
			if (!status) return;
			status.textContent = message;
			clearTimeout(timer);
			timer = setTimeout(() => { status.textContent = ''; }, 2500);
		});
	}
}
