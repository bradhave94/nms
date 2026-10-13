// Accessibility patches for Tabulator tables (recipe tables, creature species).
// - Tabulator puts its pagination footer and a focusable scroll holder inside the role="grid"
//   element, which breaks the grid's allowed children (axe aria-required-children). The footer
//   moves to just after the grid and the holder stops being a tab stop (the cell links are).
// - Sortable column headers become keyboard operable (Enter/Space sorts, like a click).
// - Filtering announces the number of matching rows in a polite live region.

type TabulatorLike = {
	element?: HTMLElement;
	on: (event: string, callback: (...args: unknown[]) => void) => void;
};

export function applyTabulatorA11y(table: TabulatorLike, label: string, noun = 'rows'): void {
	const status = document.createElement('p');
	status.className = 'sr-only';
	status.setAttribute('role', 'status');
	status.setAttribute('aria-live', 'polite');

	const patch = (): void => {
		// Read the element at event time: when built from a <table>, Tabulator swaps in a new div.
		const grid = table.element;
		if (!grid) return;
		grid.setAttribute('aria-label', label);
		grid.querySelector(':scope > .tabulator-tableholder')?.removeAttribute('tabindex');
		const footer = grid.querySelector(':scope > .tabulator-footer');
		if (footer) grid.after(footer);
		if (!status.isConnected) (footer ?? grid).after(status);
		grid.querySelectorAll<HTMLElement>('.tabulator-col.tabulator-sortable').forEach((col) => {
			if (col.dataset.a11ySort) return;
			col.dataset.a11ySort = '1';
			col.tabIndex = 0;
			col.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				col.click();
			});
		});
	};

	table.on('tableBuilt', patch);
	table.on('dataLoaded', patch);

	let announceTimer: ReturnType<typeof setTimeout> | undefined;
	table.on('dataFiltered', (_filters, rows) => {
		const count = Array.isArray(rows) ? rows.length : 0;
		if (announceTimer) clearTimeout(announceTimer);
		announceTimer = setTimeout(() => {
			status.textContent = `${count.toLocaleString()} ${noun} found`;
		}, 400);
	});
}
