// Shared client helpers for the calculator pages (planner, reverse, farm, base power).
import { toWebp } from '../utils/icons';

const HEX = /^#?[0-9a-f]{6}$/i;
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** Badge text for a slot: full number up to 99,999, compact above that so it fits the slot. */
export const badgeText = (quantity: number): string =>
	Math.abs(quantity) < 100000 ? quantity.toLocaleString() : compact.format(quantity);

type SlotOptions = {
	icon?: string;
	/** The item's game `Colour` (hex, with or without #). */
	colour?: string | null;
	quantity?: number;
	/** Width utility; the slot is square. */
	size?: string;
	imageBase?: string;
};

/**
 * The game's inventory slot (`.slot` in main.css): the item icon on its own colour, with an
 * optional quantity badge. Decorative: callers always put the name (and amount) in text too.
 */
export function itemSlot({ icon, colour, quantity, size = 'w-11', imageBase = '/images/items/' }: SlotOptions): HTMLSpanElement {
	const slot = document.createElement('span');
	slot.className = `slot ${size}`;
	slot.setAttribute('aria-hidden', 'true');
	if (colour && HEX.test(colour)) slot.style.setProperty('--c', `#${colour.replace('#', '')}`);
	if (icon) {
		const img = document.createElement('img');
		img.src = `${imageBase}${encodeURI(toWebp(icon))}`;
		img.alt = '';
		img.width = 64;
		img.height = 64;
		img.loading = 'lazy';
		img.decoding = 'async';
		slot.appendChild(img);
	}
	if (quantity !== undefined) {
		const badge = document.createElement('span');
		badge.className = 'qty';
		badge.textContent = badgeText(quantity);
		slot.appendChild(badge);
	}
	return slot;
}

const CLOSE_ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15"/></svg>';

/** Icon-only remove button with an accessible name. */
export function removeButton(label: string): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'calc-remove';
	button.setAttribute('aria-label', label);
	button.innerHTML = CLOSE_ICON;
	return button;
}

/**
 * Clean pasted text for a number field: "1,000", "1 000", "250 kP/s", "x3" and "12.5%" all
 * become plain numbers. Returns null when the text isn't a number at all.
 */
export function cleanNumericPaste(text: string, allowDecimal: boolean): string | null {
	let value = text.trim().replace(/[\s  ']/g, '');
	value = value.replace(/^[×x*]/i, '').replace(/(?:[a-z/%]+|[×x])$/i, '');
	if (value.includes(',') && value.includes('.')) {
		// Whichever separator comes last is the decimal point.
		value = value.lastIndexOf(',') > value.lastIndexOf('.')
			? value.replace(/\./g, '').replace(',', '.')
			: value.replace(/,/g, '');
	} else if (value.includes(',')) {
		// "1,000" / "12,500,000" are thousands; "2,5" is a decimal comma.
		value = /^-?\d{1,3}(,\d{3})+$/.test(value) ? value.replace(/,/g, '') : value.replace(',', '.');
	}
	if (!/^-?\d+(\.\d+)?$/.test(value) && !/^-?\.\d+$/.test(value)) return null;
	if (!allowDecimal && value.includes('.')) {
		// "3.0" is a whole number; "2.5" in a whole-number field stays as typed so validation shows.
		if (!/\.0+$/.test(value)) return value;
		value = value.replace(/\.0+$/, '');
	}
	return value;
}

/**
 * Number inputs throw away a paste the browser can't parse ("1,000" pastes nothing in Chrome).
 * Clean it up first, then fire input + change so the calculators update as if typed.
 */
export function bindNumericPaste(root: ParentNode) {
	root.addEventListener('paste', (event) => {
		const field = event.target;
		if (!(field instanceof HTMLInputElement) || field.type !== 'number' || field.disabled || field.readOnly) return;
		const text = (event as ClipboardEvent).clipboardData?.getData('text') ?? '';
		const cleaned = cleanNumericPaste(text, field.step === 'any' || field.step.includes('.'));
		if (cleaned === null) return;
		event.preventDefault();
		field.value = cleaned;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		field.dispatchEvent(new Event('change', { bubbles: true }));
	}, true);
}

/**
 * Arrow-key movement for a search field and its result buttons: Down from the field goes to the
 * first result, Up/Down move between results, Up from the first returns to the field, Escape
 * closes the list and returns to the field. Tab still works as before.
 */
export function bindResultKeys(field: HTMLInputElement, list: HTMLElement, close: () => void) {
	const buttons = () => Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
	field.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowDown' && !list.hidden && !list.classList.contains('hidden')) {
			const first = buttons()[0];
			if (first) { event.preventDefault(); first.focus(); }
		} else if (event.key === 'Escape' && !list.classList.contains('hidden')) {
			event.preventDefault();
			close();
		}
	});
	list.addEventListener('keydown', (event) => {
		const all = buttons();
		const index = all.indexOf(document.activeElement as HTMLButtonElement);
		if (index === -1) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			all[Math.min(index + 1, all.length - 1)].focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			(index === 0 ? field : all[index - 1]).focus();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
			field.focus();
		}
	});
}
