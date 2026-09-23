import { calculateBasePower, calculateBiofuel, recommendPowerSource } from '../utils/basePower';
import type { PowerCatalog } from '../utils/basePowerCatalog';

const root = document.querySelector<HTMLElement>('#base-power');
if (root) setup(root);

function setup(root: HTMLElement) {
	const catalog: PowerCatalog = JSON.parse(root.dataset.catalog!);
	const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
	const form = el<HTMLFormElement>('power-form');
	const devices = new Map(catalog.devices.map((item) => [item.id, item]));
	const selected = new Map<string, number>();
	const keys = ['load', 'reserve', 'panels', 'batteries', 'continuous', 'night', 'twilight', 'generator', 'reactors'] as const;
	const input = (key: typeof keys[number]) => el<HTMLInputElement>(`power-${key}`);
	const mode = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value;
	const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
	const node = (tag: string, text = '', classes = '') => {
		const element = document.createElement(tag);
		element.textContent = text;
		element.className = classes;
		return element;
	};
	const picture = (icon: string, size = 'h-10 w-10') => {
		const image = document.createElement('img');
		image.src = `/images/items/${encodeURIComponent(icon)}`;
		image.alt = '';
		image.width = 64; image.height = 64;
		image.className = `${size} object-contain shrink-0`;
		return image;
	};
	const link = (name: string, url: string) => {
		const a = document.createElement('a');
		a.textContent = name; a.href = url;
		a.className = 'text-sky-200 hover:text-white underline decoration-sky-700 underline-offset-4';
		return a;
	};

	function restore() {
		const params = new URLSearchParams(location.search);
		for (const key of keys) {
			const raw = params.get(key);
			if (raw === null || raw.trim() === '') continue;
			const field = input(key);
			const previous = field.value;
			field.value = raw;
			if (!field.checkValidity()) field.value = previous;
		}
		for (const [name, key, allowed] of [['load-mode', 'mode', ['total', 'devices']], ['strategy', 'source', ['auto', 'solar', 'electromagnetic', 'biofuel']]] as const) {
			const value = params.get(key);
			if (value && (allowed as readonly string[]).includes(value)) form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.checked = true;
		}
		for (const entry of (params.get('devices') ?? '').split(',').slice(0, 150)) {
			const [id, count] = entry.split(':');
			const quantity = Number(count);
			if (devices.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 10000) selected.set(id, quantity);
		}
	}

	function save() {
		const params = new URLSearchParams();
		for (const key of keys) if (input(key).value !== input(key).defaultValue) params.set(key, input(key).value);
		if (mode('load-mode') !== 'total') params.set('mode', mode('load-mode'));
		if (mode('strategy') !== 'auto') params.set('source', mode('strategy'));
		if (selected.size) params.set('devices', [...selected].map(([id, count]) => `${id}:${count}`).join(','));
		const query = params.toString();
		history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
	}

	function renderDevices() {
		el('power-devices').replaceChildren();
		el('device-empty').hidden = selected.size > 0;
		for (const [id, count] of selected) {
			const item = devices.get(id)!;
			const row = node('div', '', 'flex flex-wrap items-center gap-3 rounded border border-sky-900 p-3');
			row.append(picture(item.icon, 'h-8 w-8'));
			const text = node('div', '', 'min-w-0 flex-1 text-sm');
			text.append(link(item.name, item.url), node('div', `${item.consumption} kP/s each`, 'text-xs text-sky-400'));
			const field = document.createElement('input');
			field.type = 'number'; field.min = '1'; field.max = '10000'; field.step = '1'; field.required = true;
			field.value = String(count); field.setAttribute('aria-label', `${item.name} quantity`);
			field.className = 'w-20 rounded border border-sky-700 bg-sky-950 p-2 text-sm text-white';
			field.dataset.deviceId = id;
			field.addEventListener('input', () => {
				if (field.validity.valid) selected.set(id, field.valueAsNumber);
			});
			const remove = node('button', '×', 'px-2 text-xl text-sky-300 hover:text-white') as HTMLButtonElement;
			remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${item.name}`);
			remove.addEventListener('click', () => { selected.delete(id); renderDevices(); update(); el<HTMLSelectElement>('power-device').focus(); });
			row.append(text, field, remove);
			el('power-devices').append(row);
		}
	}

	function countCard(id: string, count: number | null, total: number | null) {
		const item = catalog.equipment.find((item) => item.id === id)!;
		const card = node('div', '', 'rounded border border-sky-800 bg-sky-950/60 p-4');
		card.append(picture(item.icon, 'h-12 w-12'), node('p', count === null ? '—' : fmt(count), 'mt-3 text-4xl font-semibold text-white'),
			node('p', `${item.name === 'Battery' ? 'Batteries' : item.name === 'Solar Panel' ? 'Solar panels' : item.id === 'U_BIOGENERATOR' ? 'Biofuel reactors' : 'Generators'} to add`, 'mt-1 text-sm text-sky-200'));
		if (total !== null) card.append(node('p', `${fmt(total)} total in this plan`, 'mt-2 text-xs text-sky-400'));
		return card;
	}

	function detail(label: string, value: string) {
		const row = node('div', '', 'flex justify-between gap-4 border-b border-sky-900 pb-2');
		row.append(node('dt', label, 'text-sky-300'), node('dd', value, 'text-right text-white'));
		el('power-details').append(row);
	}

	function materials(additions: [string, number][]) {
		const list = el('power-materials'); list.replaceChildren();
		const merged = new Map<string, { name: string; url: string; icon: string; quantity: number }>();
		for (const [id, count] of additions) {
			if (count <= 0) continue;
			for (const material of catalog.equipment.find((item) => item.id === id)!.recipe) {
				const previous = merged.get(material.id);
				merged.set(material.id, { ...material, quantity: (previous?.quantity ?? 0) + count * material.quantity });
			}
		}
		for (const material of [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))) {
			const row = node('li', '', 'flex items-center gap-3 text-sm');
			row.append(picture(material.icon, 'h-8 w-8'), link(material.name, material.url), node('span', `× ${fmt(material.quantity)}`, 'ml-auto whitespace-nowrap text-white'));
			list.append(row);
		}
		if (merged.size === 0) list.append(node('li', 'No additional power equipment needed.', 'text-sm text-sky-300'));
		const planner = el<HTMLAnchorElement>('power-planner');
		planner.hidden = merged.size === 0;
		planner.href = `/calculator/planner?${new URLSearchParams({ items: additions.filter(([, count]) => count > 0).map(([id, count]) => `${id}:${count}`).join(',') })}`;
	}

	function update() {
		el('power-share-status').textContent = '';
		const deviceMode = mode('load-mode') === 'devices';
		const strategy = mode('strategy');
		const automatic = strategy === 'auto';
		const solarEstimate = automatic || strategy === 'solar';
		el('total-fields').hidden = deviceMode;
		el('device-fields').hidden = !deviceMode;
		el('solar-fields').hidden = !solarEstimate;
		el('biofuel-fields').hidden = strategy !== 'biofuel';
		input('reactors').disabled = strategy !== 'biofuel';
		el('power-recommendation').hidden = true;
		el('generator-fields').hidden = strategy !== 'electromagnetic';
		input('load').disabled = deviceMode;
		input('night').disabled = !solarEstimate; input('twilight').disabled = !solarEstimate; input('generator').disabled = strategy !== 'electromagnetic';
		root.querySelectorAll<HTMLInputElement>('[data-device-id]').forEach((field) => { field.disabled = !deviceMode; });
		el('power-error').hidden = true;
		el('power-result-body').hidden = false;
		el('power-materials-panel').hidden = false;
		el<HTMLButtonElement>('power-share').disabled = false;
		try {
			if (!form.checkValidity()) throw new Error('Enter valid amounts. Equipment counts must be whole numbers; all amounts must be within the shown limits.');
			const load = deviceMode ? [...selected].reduce((sum, [id, count]) => sum + devices.get(id)!.consumption * count, 0) : input('load').valueAsNumber;
			const calculation = { load, reservePercent: input('reserve').valueAsNumber,
				continuousPower: input('continuous').valueAsNumber, installedPanels: input('panels').valueAsNumber,
				installedBatteries: input('batteries').valueAsNumber, cycleSeconds: catalog.cycleSeconds,
				nightSeconds: solarEstimate ? input('night').valueAsNumber * 60 : catalog.cycleSeconds / 2,
				twilightSeconds: solarEstimate ? input('twilight').valueAsNumber * 60 : 0,
				panelRate: catalog.panelRate, batteryCapacity: catalog.batteryCapacity,
				generatorRate: strategy === 'electromagnetic' ? input('generator').valueAsNumber : 150 };
			let result = calculateBasePower(calculation);
			const source = automatic ? recommendPowerSource(result) : strategy;
			const solar = source === 'solar';
			const biofuel = source === 'biofuel';
			if (source === 'electromagnetic') {
				el('generator-fields').hidden = false;
				input('generator').disabled = false;
				if (!input('generator').checkValidity()) throw new Error('Enter a valid output per electromagnetic generator.');
				result = calculateBasePower({ ...calculation, generatorRate: input('generator').valueAsNumber });
			}
			const reactorRate = catalog.equipment.find((item) => item.id === 'U_BIOGENERATOR')!.generation;
			const reactors = calculateBiofuel(result.designLoad, input('continuous').valueAsNumber, reactorRate, biofuel ? input('reactors').valueAsNumber : 0);
			if (automatic) {
				el('power-recommendation').hidden = false;
				el('power-recommendation').textContent = solar
					? 'Automatic recommendation: solar + batteries. Existing equipment is included.'
					: `${result.addPanels === null ? 'Solar cannot sustain this daylight estimate.' : `Solar would need ${fmt(result.addPanels)} additional panels.`} Automatic recommends electromagnetic power for this base. A hotspot is required; you can choose solar or biofuel instead.`;
			}
			el('power-budget').textContent = `${fmt(load)} kP/s consumption · ${fmt(result.designLoad)} kP/s with spare capacity`;
			el('result-heading').textContent = load === 0 ? 'Start with your base’s power draw' : solar ? 'Power through the night' : biofuel ? 'Power while your reactors are fueled' : 'Continuous power from a hotspot';
			el('power-counts').replaceChildren(...(solar ? [countCard('U_SOLAR_S', result.addPanels, result.targetPanels), countCard('U_BATTERY_S', result.addBatteries, result.targetBatteries)] : biofuel ? [countCard('U_BIOGENERATOR', reactors.additions, reactors.total)] : [countCard('U_GENERATOR_S', result.addGenerators, null)]));
			const status = el('power-status');
			if (load === 0) status.textContent = 'Enter a consumption reading or add devices to calculate a plan.';
			else if (biofuel) status.textContent = `${reactors.additions === 0 ? 'Your existing reactors and continuous generation cover this load' : `Add ${fmt(reactors.additions)} biofuel reactor${reactors.additions === 1 ? '' : 's'} to cover this load`}, as long as all reactors remain fueled. Refuel each reactor manually; this is not an unattended power supply.`;
			else if (!solar) status.textContent = result.addGenerators === 0 ? 'Your continuous generation already covers the planned load.' : `Add ${fmt(result.addGenerators)} generator${result.addGenerators === 1 ? '' : 's'} at the entered output. This covers the planned load without relying on solar or batteries.`;
			else if (!result.solarPossible) status.textContent = 'Solar cannot sustain this load without sunlight. Choose electromagnetic power or adjust the daylight estimate.';
			else if (result.existingWorks) status.textContent = 'Your existing setup covers this load under the selected daylight estimate.';
			else if (result.existingEnergyBalance < -1e-6) status.textContent = 'Your current panels cannot replace a full day’s energy use. Add the equipment above; batteries alone will not fix the daily shortfall.';
			else status.textContent = 'Daily generation is sufficient, but your current batteries cannot bridge the longest power shortfall. Add the storage above.';
			el('power-details').replaceChildren();
			detail('Continuous power already available', `${fmt(input('continuous').valueAsNumber)} kP/s`);
			detail('Remaining load to cover', `${fmt(result.residualLoad)} kP/s`);
			if (solar) {
				detail('Full sun / twilight / darkness', `${fmt(result.daySeconds / 60)} / ${fmt(input('twilight').valueAsNumber)} / ${fmt(input('night').valueAsNumber)} min`);
				if (result.targetPanels !== null && result.requiredStorage !== null) {
					detail('Planned peak solar output', `${fmt(result.targetPanels * catalog.panelRate)} kP/s`);
					detail('Energy storage required', `${fmt(result.requiredStorage)} kP`);
					detail('Planned battery capacity', `${fmt(result.targetBatteries! * catalog.batteryCapacity)} kP`);
				}
			} else if (biofuel) {
				detail('Output per fueled reactor', `${fmt(reactorRate)} kP/s`);
				detail('Existing reactors', fmt(input('reactors').valueAsNumber));
				detail('Total reactor output while fueled', `${fmt(reactors.output)} kP/s`);
			} else detail('Additional continuous output', `${fmt(result.addGenerators * input('generator').valueAsNumber)} kP/s`);
			if (solar && !result.solarPossible) el('power-materials-panel').hidden = true;
			else materials(solar ? [['U_SOLAR_S', result.addPanels!], ['U_BATTERY_S', result.addBatteries!]] : biofuel ? [['U_BIOGENERATOR', reactors.additions]] : [['U_GENERATOR_S', result.addGenerators]]);
			save();
		} catch (error) {
			el('power-error').textContent = error instanceof Error ? error.message : 'Check your input values.';
			el('power-error').hidden = false;
			el('power-result-body').hidden = true;
			el('power-materials-panel').hidden = true;
			el<HTMLButtonElement>('power-share').disabled = true;
		}
	}

	form.addEventListener('submit', (event) => event.preventDefault());
	form.addEventListener('input', update);
	form.addEventListener('change', update);
	el('power-add').addEventListener('click', () => {
		const id = el<HTMLSelectElement>('power-device').value;
		if (!devices.has(id)) return;
		selected.set(id, Math.min(10000, (selected.get(id) ?? 0) + 1));
		renderDevices(); update();
	});
	root.querySelectorAll<HTMLButtonElement>('[data-strength]').forEach((button) => button.addEventListener('click', () => {
		input('generator').value = button.dataset.strength!; update();
	}));
	el('power-reset').addEventListener('click', () => {
		form.reset(); selected.clear(); renderDevices(); update(); el('power-share-status').textContent = '';
	});
	el('power-share').addEventListener('click', async () => {
		const sharedUrl = location.href;
		try {
			await navigator.clipboard.writeText(sharedUrl);
			if (location.href === sharedUrl) el('power-share-status').textContent = 'Plan link copied.';
		}
		catch { el('power-share-status').textContent = 'Copy the address from your browser to share this plan.'; }
	});
	restore(); renderDevices(); update();
}
