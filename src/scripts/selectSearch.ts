/**
 * Upgrades <select data-searchable> into a type-to-filter combobox. The native select stays in
 * the form (hidden) and holds the submitted value, so the page still works without JavaScript.
 * Long native pickers are awkward on phones, and iOS can make options near the end hard to reach.
 */

const normalise = (text: string): string =>
	text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let instances = 0;

const enhance = (select: HTMLSelectElement): void => {
	const id = `select-search-${++instances}`;
	const options = [...select.options].filter((option) => option.value);
	const labelOf = (option: HTMLOptionElement) => option.textContent?.trim() ?? option.value;
	const selectedOption = () => options.find((option) => option.value === select.value);

	const wrapper = document.createElement('div');
	wrapper.className = 'select-search';
	const input = document.createElement('input');
	input.type = 'text';
	input.id = `${id}-input`;
	input.autocomplete = 'off';
	input.spellcheck = false;
	input.placeholder = select.dataset.searchPlaceholder ?? 'Type to search…';
	input.setAttribute('role', 'combobox');
	input.setAttribute('aria-autocomplete', 'list');
	input.setAttribute('aria-expanded', 'false');
	input.setAttribute('aria-controls', `${id}-list`);
	for (const name of ['aria-invalid', 'aria-describedby']) {
		const value = select.getAttribute(name);
		if (value) input.setAttribute(name, value);
	}
	const list = document.createElement('ul');
	list.id = `${id}-list`;
	list.setAttribute('role', 'listbox');
	list.hidden = true;

	// Point the existing label at the new input.
	const label = select.id ? document.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`) : null;
	if (label) {
		label.htmlFor = input.id;
		list.setAttribute('aria-label', label.textContent?.trim() ?? '');
	}

	select.hidden = true;
	select.tabIndex = -1;
	select.after(wrapper);
	wrapper.append(input, list);

	let matches: HTMLOptionElement[] = [];
	let active = -1;

	const showSelected = () => {
		const option = selectedOption();
		input.value = option ? labelOf(option) : '';
	};

	const setActive = (index: number) => {
		active = index;
		[...list.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
		const item = list.children[index] as HTMLElement | undefined;
		if (item) {
			input.setAttribute('aria-activedescendant', item.id);
			item.scrollIntoView({ block: 'nearest' });
		} else {
			input.removeAttribute('aria-activedescendant');
		}
	};

	const render = (query: string) => {
		const q = normalise(query);
		// Number searches match the start of the number ("25" finds 25 and 250–255); text matches anywhere.
		matches = options.filter((option) => {
			if (!q) return true;
			const text = normalise(labelOf(option));
			return /^\d+$/.test(q) ? text.startsWith(q) || text.startsWith(`${q}.`) : text.includes(q);
		});
		list.replaceChildren(
			...(matches.length
				? matches.map((option, index) => {
						const item = document.createElement('li');
						item.id = `${id}-option-${index}`;
						item.setAttribute('role', 'option');
						item.textContent = labelOf(option);
						return item;
					})
				: [Object.assign(document.createElement('li'), { className: 'select-search-empty', textContent: 'No matches' })])
		);
		const selectedIndex = matches.indexOf(selectedOption()!);
		setActive(q ? 0 : selectedIndex);
	};

	const open = () => {
		if (!list.hidden) return;
		list.hidden = false;
		input.setAttribute('aria-expanded', 'true');
	};
	const close = () => {
		list.hidden = true;
		input.setAttribute('aria-expanded', 'false');
		input.removeAttribute('aria-activedescendant');
	};

	const choose = (option: HTMLOptionElement | undefined) => {
		if (option) {
			select.value = option.value;
			select.dispatchEvent(new Event('change', { bubbles: true }));
		}
		showSelected();
		close();
	};

	input.addEventListener('focus', () => {
		input.select();
		render('');
		open();
	});
	input.addEventListener('input', () => {
		render(input.value);
		open();
	});
	input.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (list.hidden) {
				render('');
				open();
				return;
			}
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setActive(Math.min(Math.max(active + step, 0), matches.length - 1));
		} else if (event.key === 'Enter' && !list.hidden) {
			event.preventDefault();
			choose(matches[active]);
		} else if (event.key === 'Escape') {
			showSelected();
			close();
		}
	});
	// pointerdown fires before blur, so a tap on an option isn't lost when the input loses focus.
	list.addEventListener('pointerdown', (event) => {
		event.preventDefault();
		const item = (event.target as HTMLElement).closest('[role="option"]');
		if (item) choose(matches[[...list.children].indexOf(item)]);
	});
	input.addEventListener('blur', () => {
		// Accept an exact typed match; otherwise restore the previous choice.
		const typed = normalise(input.value);
		const exact = options.find((option) => normalise(option.value) === typed || normalise(labelOf(option)) === typed);
		choose(exact);
	});

	showSelected();
};

document.querySelectorAll<HTMLSelectElement>('select[data-searchable]').forEach(enhance);
