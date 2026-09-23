/** Power rates are kP/s; energy is kP. All durations are real seconds. */
export function isPlanetPowerPart(item: {
	BuildableOnPlanetBase?: boolean; ShowInBuildMenu?: boolean;
}): boolean {
	// IsPlaceable=false also describes snap-only doors and corridors, not just
	// unavailable parts. Planet eligibility and build-menu visibility apply here.
	return item.BuildableOnPlanetBase === true && item.ShowInBuildMenu !== false;
}

export type PowerInput = {
	load: number;
	reservePercent: number;
	continuousPower: number;
	installedPanels: number;
	installedBatteries: number;
	cycleSeconds: number;
	nightSeconds: number;
	twilightSeconds: number;
	panelRate: number;
	batteryCapacity: number;
	generatorRate: number;
};

export type Phase = { name: string; seconds: number; solarFraction: number };

// A planning preference, not a game rule. Existing adequate solar stays useful.
export const AUTO_SOLAR_PANEL_LIMIT = 20;
export function recommendPowerSource(plan: ReturnType<typeof calculateBasePower>): 'solar' | 'electromagnetic' {
	return !plan.existingWorks && (!plan.solarPossible || (plan.addPanels ?? 0) >= AUTO_SOLAR_PANEL_LIMIT)
		? 'electromagnetic' : 'solar';
}

export function calculateBiofuel(designLoad: number, continuousPower: number, reactorRate: number, installedReactors: number) {
	if (![designLoad, continuousPower, reactorRate, installedReactors].every((n) => Number.isFinite(n) && n >= 0)
		|| reactorRate === 0 || !Number.isInteger(installedReactors)) throw new Error('Invalid biofuel equipment or output.');
	const required = roundUp(Math.max(0, designLoad - continuousPower) / reactorRate);
	const total = Math.max(installedReactors, required);
	return { total, additions: total - installedReactors, output: total * reactorRate };
}

function roundUp(value: number): number {
	if (value <= 0) return 0;
	const nearest = Math.round(value);
	const tolerance = 2 * Number.EPSILON * Math.abs(value);
	return nearest > 0 && Math.abs(value - nearest) <= tolerance ? nearest : Math.ceil(value);
}

/** Maximum cumulative deficit over any contiguous interval of a repeating cycle. */
export function storageRequired(phases: Phase[], load: number, solar: number): number {
	const deficits = phases.map((phase) => (load - solar * phase.solarFraction) * phase.seconds);
	let maximum = 0;
	for (let start = 0; start < deficits.length; start++) {
		let sum = 0;
		for (let length = 0; length < deficits.length; length++) {
			sum += deficits[(start + length) % deficits.length];
			maximum = Math.max(maximum, sum);
		}
	}
	return maximum;
}

export function calculateBasePower(input: PowerInput) {
	for (const [key, value] of Object.entries(input)) {
		if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a finite, non-negative number.`);
	}
	if (input.cycleSeconds <= 0 || input.panelRate <= 0 || input.batteryCapacity <= 0 || input.generatorRate <= 0) {
		throw new Error('Cycle length, panel output, battery capacity and generator output must be greater than zero.');
	}
	if (![input.installedPanels, input.installedBatteries].every(Number.isInteger)) {
		throw new Error('Panel and battery counts must be whole numbers.');
	}
	const daySeconds = input.cycleSeconds - input.nightSeconds - input.twilightSeconds;
	if (daySeconds < 0) throw new Error('Darkness and twilight must fit within the day cycle.');
	const phases: Phase[] = [
		{ name: 'Full sun', seconds: daySeconds, solarFraction: 1 },
		{ name: 'Dusk', seconds: input.twilightSeconds / 2, solarFraction: 0.5 },
		{ name: 'Night', seconds: input.nightSeconds, solarFraction: 0 },
		{ name: 'Dawn', seconds: input.twilightSeconds / 2, solarFraction: 0.5 },
	];
	const designLoad = input.load * (1 + input.reservePercent / 100);
	const residualLoad = Math.max(0, designLoad - input.continuousPower);
	const effectiveSunSeconds = daySeconds + input.twilightSeconds / 2;
	const solarPossible = residualLoad === 0 || effectiveSunSeconds > 0;
	const minimumPanels = residualLoad === 0 ? 0 : solarPossible
		? roundUp(residualLoad * input.cycleSeconds / (input.panelRate * effectiveSunSeconds)) : null;
	const targetPanels = minimumPanels === null ? null : Math.max(input.installedPanels, minimumPanels);
	const requiredStorage = targetPanels === null ? null : storageRequired(phases, residualLoad, targetPanels * input.panelRate);
	const minimumBatteries = requiredStorage === null ? null : roundUp(requiredStorage / input.batteryCapacity);
	const targetBatteries = minimumBatteries === null ? null : Math.max(input.installedBatteries, minimumBatteries);
	const existingEnergyBalance = input.installedPanels * input.panelRate * effectiveSunSeconds - residualLoad * input.cycleSeconds;
	const existingStorageRequired = storageRequired(phases, residualLoad, input.installedPanels * input.panelRate);
	return {
		phases, daySeconds, designLoad, residualLoad, solarPossible, minimumPanels, targetPanels,
		requiredStorage, minimumBatteries, targetBatteries,
		addPanels: targetPanels === null ? null : targetPanels - input.installedPanels,
		addBatteries: targetBatteries === null ? null : targetBatteries - input.installedBatteries,
		addGenerators: roundUp(residualLoad / input.generatorRate),
		existingEnergyBalance, existingStorageRequired,
		existingWorks: existingEnergyBalance >= -1e-6 && input.installedBatteries * input.batteryCapacity >= existingStorageRequired - 1e-6,
	};
}

export type GridData = {
	Network: string | null;
	Rate: number;
	Storage: number;
	DependsOnEnvironment?: string | null;
	DependsOnHotspots?: string | null;
	DependentConnections?: { Network: string; DependentRate: number; DependentEffect: string | null }[];
};

export function electricalValues(grid: GridData) {
	const rates = [
		...(grid.Network === 'Power' ? [grid.Rate] : []),
		...(grid.DependentConnections ?? []).filter((dep) => dep.Network === 'Power').map((dep) => dep.DependentRate),
	];
	return {
		consumption: rates.filter((rate) => rate < 0).reduce((sum, rate) => sum - rate, 0),
		generation: rates.filter((rate) => rate > 0).reduce((sum, rate) => sum + rate, 0),
		storage: grid.Network === 'Power' ? grid.Storage : 0,
	};
}
