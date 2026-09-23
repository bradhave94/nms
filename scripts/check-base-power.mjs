import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { calculateBasePower, calculateBiofuel, recommendPowerSource, electricalValues, isPlanetPowerPart } from '../src/utils/basePower.ts';

// Audit the imported catalog, including snap-only parts and zero-draw circuits.
const items = ['Buildings', 'ConstructedTechnology', 'Products', 'Corvette']
	.flatMap((file) => JSON.parse(readFileSync(new URL(`../src/datav2/${file}.json`, import.meta.url), 'utf8')));
const byId = new Map(items.map((item) => [item.Id, item]));
const consumers = new Map(items.filter((item) => isPlanetPowerPart(item) && item.LinkGridData && item.RequiredItems?.length)
	.map((item) => [item.Id, electricalValues(item.LinkGridData).consumption]).filter(([, rate]) => rate > 0));
assert.equal(consumers.size, 69, 'Review inventory changes against the source table');
const zeroDraw = items.filter((item) => isPlanetPowerPart(item) && item.LinkGridData?.Network === 'Power')
	.filter((item) => Object.values(electricalValues(item.LinkGridData)).every((value) => value === 0));
assert.equal(zeroDraw.length, 13, 'Review connected zero-draw inventory changes');
for (const [id, rate] of Object.entries({
	CORRIDOR: 1, CORRIDORL: 1, CORRIDORT: 1, CORRIDORX: 1, CORRIDORC: 1,
	GLASSCORRIDOR: 1, VIEWSPHERE: 1, CUBEFLOOR: 1, BUILDDOOR: 1, DOOR2: 1,
	CORRIDOR_WATER: 1, CORRIDORL_WATER: 1, CORRIDORT_WATER: 1, CORRIDORX_WATER: 1, CORRIDORV_WATER: 1,
	BUILDDOOR_WATER: 2, MAINROOM: 10, MAINROOMCUBE: 10, MAINROOM_WATER: 10, MAINROOMCUBE_W: 30,
	BIOROOM: 50, CUBEROOM: 5, CURVEDCUBEROOF: 5, CUBEROOMCURVED: 5,
	PLANTER: 5, PLANTERMEGA: 20, CARBONPLANTER: 5, U_EXTRACTOR_S: 50, U_GASEXTRACTOR: 50,
	TELEPORTER: 20, U_MINIPORTAL: 5, DRESSING_TABLE: 50, BYTEBEAT: 3, NOISEBOX: 1,
	HEALTHSTATION: 10, SHIELDSTATION: 10, CREATURE_FEED: 20, CREATURE_FARM: 20, CONTAINER0: 5,
})) assert.equal(consumers.get(id), rate, `Missing or incorrect consumer: ${id}`);
for (const id of ['SPAWNER_BALL', 'U_SWITCHWALL', 'U_SWITCHBUTTON', 'U_SWITCHPROX', 'U_SWITCHPRESS', 'U_POWERLINE', 'CUBEGLASS']) {
	assert.ok(byId.get(id)?.LinkGridData, `Missing zero-draw connection metadata: ${id}`);
	assert.equal(electricalValues(byId.get(id).LinkGridData).consumption, 0);
}
for (const id of ['TELEPORTER_F', 'U_MINIPORTAL_CV', 'FRE_ROOM_EXTR', 'S_GDOORB0', 'BUILDTERMINAL', 'S_GENERATOR']) {
	assert.ok(!consumers.has(id), `Ineligible or zero-draw part counted as a consumer: ${id}`);
}
assert.equal(electricalValues(byId.get('U_SOLAR_S').LinkGridData).generation, 50);
assert.equal(electricalValues(byId.get('U_BIOGENERATOR').LinkGridData).generation, 50);
assert.equal(electricalValues(byId.get('U_BATTERY_S').LinkGridData).storage, 45000);
assert.equal(byId.get('U_GENERATOR_S').LinkGridData.DependsOnHotspots, 'Power');

const defaults = { load: 100, reservePercent: 0, continuousPower: 0, installedPanels: 0, installedBatteries: 0,
	cycleSeconds: 1800, nightSeconds: 900, twilightSeconds: 0, panelRate: 50, batteryCapacity: 45000, generatorRate: 150 };
const run = (overrides = {}) => calculateBasePower({ ...defaults, ...overrides });
assert.equal(recommendPowerSource(run({ load: 475 })), 'solar');
assert.equal(recommendPowerSource(run({ load: 500 })), 'electromagnetic');
assert.equal(recommendPowerSource(run({ load: 10000 })), 'electromagnetic');
assert.equal(recommendPowerSource(run({ load: 10000, installedPanels: 400, installedBatteries: 200 })), 'solar');
assert.equal(recommendPowerSource(run({ load: 10000, continuousPower: 10000 })), 'solar');
assert.equal(recommendPowerSource(run({ nightSeconds: 1800 })), 'electromagnetic');
assert.deepEqual(calculateBiofuel(101, 0, 50, 1), { total: 3, additions: 2, output: 150 });
assert.deepEqual(calculateBiofuel(100, 50, 50, 0), { total: 1, additions: 1, output: 50 });
assert.deepEqual(calculateBiofuel(100, 0, 50, 4), { total: 4, additions: 0, output: 200 });
assert.deepEqual(calculateBiofuel(0, 0, 50, 0), { total: 0, additions: 0, output: 0 });
assert.throws(() => calculateBiofuel(100, 0, 0, 0));
assert.throws(() => calculateBiofuel(100, 0, 50, 0.5));
assert.equal(run({ load: 200.000000025 }).minimumPanels, 9, 'A real fractional shortfall must round up');
assert.equal(run({ load: 200.000000025 }).minimumBatteries, 5);
assert.equal(calculateBiofuel(200.000000025, 0, 50, 0).total, 5);
assert.equal(calculateBiofuel(1e-12, 0, 50, 0).total, 1, 'A positive load still needs a source');
assert.equal(run().addPanels, 4);
assert.equal(run().addBatteries, 2);
assert.equal(run({ load: 50 }).addPanels, 2);
assert.equal(run({ load: 50 }).addBatteries, 1);
assert.equal(run({ load: 0 }).addBatteries, 0);
assert.equal(run({ continuousPower: 100 }).addPanels, 0);
assert.equal(run({ continuousPower: 25 }).addPanels, 3);
assert.equal(run({ reservePercent: 10 }).addPanels, 5);
assert.equal(run({ installedPanels: 4, installedBatteries: 2 }).existingWorks, true);
assert.equal(run({ installedPanels: 3, installedBatteries: 100 }).existingWorks, false, 'Storage cannot fix insufficient daily generation');
assert.equal(run({ installedPanels: 5, installedBatteries: 1 }).existingWorks, false);
assert.equal(run({ installedPanels: 10, installedBatteries: 10 }).addPanels, 0);
assert.equal(run({ nightSeconds: 0, twilightSeconds: 1800 }).addPanels, 4);
assert.equal(run({ nightSeconds: 0, twilightSeconds: 1800 }).addBatteries, 0);
assert.equal(run({ nightSeconds: 1800 }).solarPossible, false);
assert.equal(run({ nightSeconds: 1800 }).addGenerators, 1);
assert.throws(() => run({ nightSeconds: 1801 }));
assert.throws(() => run({ load: NaN }));
assert.throws(() => run({ installedPanels: 0.5 }));
assert.throws(() => run({ load: -1 }));
assert.deepEqual(electricalValues({ Network: 'Resources', Rate: 100, Storage: 360000, DependentConnections: [{ Network: 'Power', DependentRate: -50, DependentEffect: 'EnablesRate' }] }), { consumption: 50, generation: 0, storage: 0 });
assert.deepEqual(electricalValues({ Network: 'Fuel', Rate: -1, Storage: 180000, DependentConnections: [{ Network: 'Power', DependentRate: 50, DependentEffect: 'None' }] }), { consumption: 0, generation: 50, storage: 0 });

// Independent per-second simulation: recommended equipment must survive repeated
// cycles, including dawn/dusk deficits and existing surplus panel capacity.
for (const [load, reservePercent] of [[1, 0], [24, 0], [25, 0], [26, 0], [50, 0], [101, 0], [237, 0], [101, 25]]) {
	for (const nightSeconds of [0, 600, 900, 1200]) {
		const input = { ...defaults, load, reservePercent, nightSeconds, twilightSeconds: 120 };
		const result = calculateBasePower(input);
		const capacity = result.targetBatteries * input.batteryCapacity;
		let energy = capacity;
		for (let cycle = 0; cycle < 3; cycle++) {
			for (const phase of result.phases) {
				for (let second = 0; second < phase.seconds; second++) {
					energy = Math.min(capacity, energy + result.targetPanels * input.panelRate * phase.solarFraction - result.designLoad);
					assert.ok(energy >= -1e-6, `Failed cycle for ${load} power / ${nightSeconds}s night`);
				}
			}
		}
	}
}
process.stdout.write('Power calculations, electrical network interpretation and repeated-cycle simulations passed.\n');
