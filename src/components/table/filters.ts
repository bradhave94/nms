// Client behaviour for FilterBar.astro, shared by the recipe tables and the card views.
// Search listens on `input` (typing, paste, autofill, the clear button all filter).

export type FilterMode = 'out' | 'in' | 'both';

export interface FilterState {
	/** Lower-cased, trimmed query. */
	q: string;
	mode: FilterMode;
	/** Number of inputs (machine size); 0 = any. */
	size: number;
}

export interface Searchable {
	/** Lower-cased output name. */
	so: string;
	/** Lower-cased input names, joined with "|". */
	si: string;
	/** Number of inputs. */
	n: number;
	/** Lower-cased operation name ("subjugation of glass"); matched in "Both" mode, as the old table search did. */
	sop?: string;
}

export const matches = (state: FilterState, row: Searchable): boolean => {
	if (state.size && row.n !== state.size) return false;
	if (!state.q) return true;
	const out = row.so.includes(state.q);
	if (state.mode === 'out') return out;
	const used = row.si.includes(state.q);
	return state.mode === 'in' ? used : out || used || Boolean(row.sop?.includes(state.q));
};

export const isFiltering = (state: FilterState): boolean => Boolean(state.q || state.size);

export const countLabel = (count: number, state: FilterState, bestFirst: boolean): string =>
	`${count.toLocaleString()} ${count === 1 ? 'recipe' : 'recipes'}${state.q && bestFirst && count > 1 ? ' · best yield first' : ''}`;

/** Wire up the bar inside `root`. Calls `onChange` (debounced for typing) with the new state. */
export function bindFilters(root: ParentNode, onChange: (state: FilterState) => void): FilterState {
	const state: FilterState = { q: '', mode: 'out', size: 0 };
	const input = root.querySelector<HTMLInputElement>('[data-rt-q]');
	const clear = root.querySelector<HTMLButtonElement>('[data-rt-clear]');

	let timer: ReturnType<typeof setTimeout> | undefined;
	const readQuery = (): void => {
		state.q = (input?.value ?? '').trim().toLowerCase();
		if (clear) clear.hidden = !input?.value;
	};
	input?.addEventListener('input', () => {
		readQuery();
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => onChange(state), 120);
	});
	clear?.addEventListener('click', () => {
		if (!input) return;
		input.value = '';
		readQuery();
		input.focus();
		onChange(state);
	});

	const bindSegment = (selector: string, apply: (value: string) => void): void => {
		const group = root.querySelector<HTMLElement>(selector);
		if (!group) return;
		const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-value]')];
		buttons.forEach((button) => {
			button.addEventListener('click', () => {
				buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
				apply(button.dataset.value ?? '');
				onChange(state);
			});
		});
	};
	bindSegment('[data-rt-mode]', (value) => {
		state.mode = value === 'in' || value === 'both' ? value : 'out';
	});
	bindSegment('[data-rt-size]', (value) => {
		state.size = Number(value) || 0;
	});

	// A value restored by the browser (back/forward) or typed before the script ran.
	if (input?.value) {
		readQuery();
		queueMicrotask(() => onChange(state));
	}
	return state;
}
