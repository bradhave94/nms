import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tables, validateImages, publishImport } from './import-safety.mjs';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_EXTRACTOR_ROOT = path.resolve(SITE_ROOT, '..', 'nms-data-extractor');
const MANIFEST_NAME = 'extraction-manifest.json';
const REQUIRED_SOURCES = ["nms_reality_gcproducttable.MXML","consumableitemtable.MXML","nms_reality_gcrecipetable.MXML","nms_reality_gctechnologytable.MXML","basebuildingobjectstable.MXML","nms_reality_gcsubstancetable.MXML","fishdatatable.MXML","nms_modularcustomisationproducts.MXML","nms_basepartproducts.MXML","nms_reality_gcproceduraltechnologytable.MXML","rewardtable.MXML","peteggtraitmodifieroverridetable.MXML","nms_loc1_english.MXML","nms_loc4_english.MXML","nms_loc5_english.MXML","nms_loc6_english.MXML","nms_loc7_english.MXML","nms_loc8_english.MXML","nms_loc9_english.MXML","nms_update3_english.MXML","creaturedatatable.MXML","creaturefilenametable.MXML","petbattlermovestable.MXML","petbattlermovesetstable.MXML","gametablesdatatable.MXML","petshopitemstable.MXML","petaccessorytable.MXML","peteggspeciesoverridetable.MXML","creaturepetbehaviourtable.MXML","leveledstatstable.MXML","gccreatureglobals.MXML"];
const IGNORED_DATA_NAMES = new Set([MANIFEST_NAME, 'controllerLookup.generated.json']);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STATIC_UI_ICONS = [
	'SPEC_PB_EGG01.png',
	'biomes--stats.planet.fire.png',
	'moves--move.pet.attack.png',
	'biomes--stats.planet.mech.png',
	'biomes--stats.planet.lush.png',
];

const SOURCE_FILE_SEGMENTS = {
	'Buildings.json': 'buildings',
	'ConstructedTechnology.json': 'technology',
	'Corvette.json': 'corvette',
	'Curiosities.json': 'curiosities',
	'Exocraft.json': 'exocraft',
	'Fish.json': 'fish',
	'Food.json': 'food',
	'NutrientProcessor.json': 'nutrient-processor',
	'Others.json': 'other',
	'Products.json': 'products',
	'RawMaterials.json': 'raw',
	'Refinery.json': 'refinery',
	'Starships.json': 'starships',
	'Technology.json': 'technology',
	'TechnologyModule.json': 'technology',
	'Trade.json': 'other',
	'Upgrades.json': 'upgrades',
	'Creatures.json': 'creatures',
};

const SUPPORTED_ITEM_ROUTE_SEGMENTS = new Set([
	'raw',
	'products',
	'food',
	'cooking',
	'curiosities',
	'fish',
	'technology',
	'other',
	'refinery',
	'nutrient-processor',
	'buildings',
	'upgrades',
	'exocraft',
	'starships',
	'corvette',
]);

const CREATURE_HUB_SEGMENTS = new Set([
	'arena',
	'affinities',
	'affinites',
	'moves',
	'companions',
	'species',
	'modes',
	'movesets',
	'accessories',
	'behaviours',
	'egg-overrides',
	'league',
	'rewards',
	'ai-configs',
]);

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value) => {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
};

const normalizeVersionLabel = (value) => {
	const match = nonEmptyString(value)?.match(/^(\d+)\.(\d+)/);
	return match ? `${Number(match[1])}.${Number(match[2])}` : undefined;
};

const normalizeRoute = (route) => {
	const withLeadingSlash = route.startsWith('/') ? route : `/${route}`;
	return withLeadingSlash.replace(/\/+/g, '/');
};

const isSupportedItemRoute = (route) => {
	const normalized = normalizeRoute(route);
	const [pathPart, hash = ''] = normalized.split('#', 2);
	if (pathPart === '/creatures/arena' && hash.startsWith('pet-shop-')) return true;
	const parts = pathPart.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
	if (parts.length !== 2) return false;
	const [segment, id] = parts;
	if (SUPPORTED_ITEM_ROUTE_SEGMENTS.has(segment)) return true;
	return segment === 'creatures' && !CREATURE_HUB_SEGMENTS.has(id);
};

const normalizeSlug = (slug) => {
	const trimmed = slug.replace(/^\/+/, '');
	if (trimmed.startsWith('creatures/shop/')) {
		const eggId = trimmed.slice('creatures/shop/'.length);
		return eggId ? `/creatures/arena#pet-shop-${eggId}` : '/creatures/arena';
	}
	const normalized = trimmed.startsWith('cooking/') ? trimmed.replace(/^cooking\//, 'food/') : trimmed;
	return `/${normalized}`.replace(/\/+/g, '/');
};

const routeForRecord = (record, sourceFile) => {
	const slug = nonEmptyString(record.Slug);
	if (slug) return normalizeSlug(slug);
	const id = nonEmptyString(record.Id) ?? (Number.isFinite(record.Id) ? String(record.Id) : undefined);
	const segment = SOURCE_FILE_SEGMENTS[path.basename(sourceFile)];
	return id && segment ? `/${segment}/${id}` : undefined;
};

const collectRouteCandidates = (value, sourceFile, candidates, seenObjects) => {
	if (Array.isArray(value)) {
		for (const entry of value) collectRouteCandidates(entry, sourceFile, candidates, seenObjects);
		return;
	}
	if (!isRecord(value)) return;
	if (seenObjects.has(value)) return;
	seenObjects.add(value);

	const hasId = nonEmptyString(value.Id) !== undefined ||
		(typeof value.Id === 'number' && Number.isFinite(value.Id));
	if (hasId) {
		candidates.push({ record: value, sourceFile });
		return;
	}
	for (const child of Object.values(value)) {
		collectRouteCandidates(child, sourceFile, candidates, seenObjects);
	}
};


const isFile = async (filePath) => {
	try {
		return (await stat(filePath)).isFile();
	} catch {
		return false;
	}
};

const isDirectory = async (directoryPath) => {
	try {
		return (await stat(directoryPath)).isDirectory();
	} catch {
		return false;
	}
};


const sha256 = async (filePath) =>
	createHash('sha256').update(await readFile(filePath)).digest('hex');

const validateManifest = async (manifest, sourceRoot, jsonDir, errors) => {
	if (!isRecord(manifest)) {
		errors.push('extraction-manifest.json must contain an object');
		return;
	}
	if (manifest.schemaVersion !== 1) {
		errors.push(`extraction manifest schemaVersion must be 1 (got ${String(manifest.schemaVersion)})`);
	}
	if (!nonEmptyString(manifest.gameVersion)) errors.push('extraction manifest gameVersion is required');
	if (!nonEmptyString(manifest.compilerVersion)) errors.push('extraction manifest compilerVersion is required');
	if (normalizeVersionLabel(manifest.compilerVersion) !== normalizeVersionLabel(manifest.gameVersion)) errors.push('Compiler/game release mismatch');
	const actualOutputs = (await readdir(jsonDir)).filter(n => n.endsWith('.json') && n !== MANIFEST_NAME);
	for (const name of [...tables, 'new.json', 'localization.json', 'controllerLookup.generated.json', ...actualOutputs]) {
		if (!manifest.outputs?.[name]) errors.push(`Missing output manifest entry: ${name}`);
	}
	for (const name of REQUIRED_SOURCES) if (!manifest.sources?.[name]) errors.push(`Missing source manifest entry: ${name}`);

	for (const sectionName of ['sources', 'outputs']) {
		const section = manifest[sectionName];
		if (!isRecord(section)) {
			errors.push(`extraction manifest ${sectionName} must be an object`);
			continue;
		}
		if (sectionName === 'outputs' && Object.keys(section).length === 0) {
			errors.push('extraction manifest outputs must not be empty');
		}
		for (const [name, expectedHash] of Object.entries(section)) {
			if (!/^[a-f0-9]{64}$/i.test(String(expectedHash))) {
				errors.push(`extraction manifest ${sectionName}.${name} must be a SHA-256 hash`);
				continue;
			}
			const filePath = name === path.basename(name) && !/[\\/:]/.test(name)
				? path.join(sectionName === 'outputs' ? jsonDir : path.join(sourceRoot, 'data', 'mbin'), name) : undefined;
			if (!filePath || !(await isFile(filePath))) {
				errors.push(`extraction manifest ${sectionName}.${name} does not resolve to a file`);
				continue;
			}
			const actualHash = await sha256(filePath);
			if (actualHash.toLowerCase() !== String(expectedHash).toLowerCase()) {
				errors.push(`extraction manifest hash mismatch for ${sectionName}.${name}`);
			}
		}
	}
};

const findManifest = async (sourceRoot, jsonDir, errors) => {
	const locations = [path.join(jsonDir, MANIFEST_NAME), path.join(sourceRoot, MANIFEST_NAME)];
	for (const location of locations) {
		if (!(await isFile(location))) continue;
		try {
			return JSON.parse(await readFile(location, 'utf8'));
		} catch (error) {
			errors.push(`unable to parse ${MANIFEST_NAME}: ${error.message}`);
			return undefined;
		}
	}
	return null;
};

const parseArgs = (argv) => {
	const options = {
		sourceRoot: process.env.NMS_EXTRACTOR_PATH || DEFAULT_EXTRACTOR_ROOT,
		mode: 'check',
		allowLegacy: false,
	};
	let modeArgument;
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === '--') continue;
		switch (argument) {
			case '--source':
				options.sourceRoot = argv[++index];
				if (!options.sourceRoot) throw new Error('--source requires a directory');
				break;
			case '--check':
			case '--check-only':
				if (modeArgument === '--sync' || modeArgument === '--import') {
					throw new Error('--check and --sync are mutually exclusive');
				}
				modeArgument = argument;
				options.mode = 'check';
				break;
			case '--sync':
			case '--import':
				if (modeArgument === '--check' || modeArgument === '--check-only') {
					throw new Error('--check and --sync are mutually exclusive');
				}
				modeArgument = argument;
				options.mode = 'sync';
				break;
			case '--allow-legacy':
				options.allowLegacy = true;
				break;
			case '--help':
				process.stdout.write('Usage: node scripts/import-extractor-data.mjs [--check|--check-only|--sync] [--allow-legacy] [--source PATH]\n');
				process.exit(0);
				break;
			default:
				throw new Error(`unknown option: ${argument}`);
		}
	}
	return options;
};

const loadJsonFiles = async (jsonDir, errors) => {
	if (!(await isDirectory(jsonDir))) {
		errors.push(`missing extractor JSON directory: ${jsonDir}`);
		return [];
	}
	const files = (await readdir(jsonDir, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !IGNORED_DATA_NAMES.has(entry.name))
		.map((entry) => entry.name)
		.sort();
	const parsed = [];
	for (const name of files) {
		const filePath = path.join(jsonDir, name);
		try {
			const data = JSON.parse(await readFile(filePath, 'utf8'));
			if (!Array.isArray(data) && !isRecord(data)) {
				errors.push(`${name} must contain an array or object`);
			}
			parsed.push({ name, data });
		} catch (error) {
			errors.push(`unable to parse ${name}: ${error.message}`);
		}
	}
	return parsed;
};

const validatePngReferences = async (parsedFiles, imageDir, errors) => {
	if (!(await isDirectory(imageDir))) {
		errors.push(`missing extractor image directory: ${imageDir}`);
		return 0;
	}
	const imageFiles = (await readdir(imageDir, { withFileTypes: true }))
		.filter((entry) => entry.isFile())
		.reduce((map, entry) => map.set(entry.name.toLowerCase(), path.join(imageDir, entry.name)), new Map());
	const candidates = [];
	for (const { name, data } of parsedFiles) {
		collectRouteCandidates(data, name, candidates, new WeakSet());
	}

	const iconNames = new Set();
	const addIcon = (value, source) => {
		const icon = nonEmptyString(value);
		if (icon) iconNames.add(icon.toLowerCase());
		else if (value !== undefined && value !== null) errors.push(`invalid icon reference in ${source}`);
	};
	for (const { record, sourceFile } of candidates) {
		const name = nonEmptyString(record.Name);
		const icon = nonEmptyString(record.Icon);
		const route = routeForRecord(record, sourceFile);
		if (!name || !icon || !route || !isSupportedItemRoute(route)) continue;
		if (icon.includes('/') || icon.includes('\\') || !icon.toLowerCase().endsWith('.png')) {
			errors.push(`invalid PNG icon reference ${icon} (${sourceFile}:${String(record.Id)})`);
			continue;
		}
		addIcon(icon, `${sourceFile}:${String(record.Id)}`);
	}

	const creatureFile = parsedFiles.find(({ name }) => name === 'Creatures.json');
	if (isRecord(creatureFile?.data)) {
		for (const species of Array.isArray(creatureFile.data.Species) ? creatureFile.data.Species : []) {
			if (isRecord(species)) {
				addIcon(species.Icon, `Creatures.json:Species:${String(species.Id)}`);
				addIcon(species.BattleAffinityIcon, `Creatures.json:Species:${String(species.Id)}:BattleAffinityIcon`);
			}
		}
		for (const affinity of Array.isArray(creatureFile.data.Affinities) ? creatureFile.data.Affinities : []) {
			if (isRecord(affinity)) addIcon(affinity.Icon, `Creatures.json:Affinities:${String(affinity.Id)}`);
		}
		for (const move of Array.isArray(creatureFile.data.BattleMoves) ? creatureFile.data.BattleMoves : []) {
			if (isRecord(move)) addIcon(move.CategoryIcon, `Creatures.json:BattleMoves:${String(move.Id)}:CategoryIcon`);
		}
		for (const egg of Array.isArray(creatureFile.data.PetShop) ? creatureFile.data.PetShop : []) {
			if (isRecord(egg)) addIcon(egg.Icon, `Creatures.json:PetShop:${String(egg.Id)}`);
		}
	}
	STATIC_UI_ICONS.forEach((icon) => addIcon(icon, 'site creature hub'));

	for (const iconName of iconNames) {
		const filePath = imageFiles.get(iconName);
		if (!filePath) {
			errors.push(`missing PNG for route-eligible icon ${iconName}`);
			continue;
		}
		const header = (await readFile(filePath)).subarray(0, PNG_SIGNATURE.length);
		if (!header.equals(PNG_SIGNATURE)) errors.push(`icon is not a PNG: ${filePath}`);
	}
	return iconNames.size;
};

const readSiteVersionKey = async (errors) => {
	try {
		const config = await readFile(path.join(SITE_ROOT, 'src', 'config.ts'), 'utf8');
		const match = config.match(/version_key\s*:\s*["']([^"']+)["']/);
		if (match) return match[1];
	} catch (error) {
		errors.push(`unable to read site release metadata: ${error.message}`);
	}
	errors.push('site release metadata must declare version_key');
	return undefined;
};


const main = async () => {
	const options = parseArgs(process.argv.slice(2));
	const sourceRoot = path.resolve(options.sourceRoot);
	const jsonDir = path.join(sourceRoot, 'data', 'json');
	const imageDir = path.join(sourceRoot, 'data', 'images');
	const siteDataDir = path.join(SITE_ROOT, 'src', 'datav2');
	const errors = [];
	if (await isFile(path.join(sourceRoot, '.extraction.lock'))) throw new Error('Extractor refresh is running; retry after it finishes');

	const manifest = await findManifest(sourceRoot, jsonDir, errors);
	if (manifest === null) {
		console.warn(`No ${MANIFEST_NAME} found; validating legacy extractor output in read-only mode.`);
		if (options.mode === 'sync' && !options.allowLegacy) {
			errors.push(`--sync requires ${MANIFEST_NAME}; pass --allow-legacy to import legacy output explicitly`);
		}
	} else if (manifest !== undefined) {
		await validateManifest(manifest, sourceRoot, jsonDir, errors);
	}

	const parsedFiles = await loadJsonFiles(jsonDir, errors);
	const newFile = parsedFiles.find(({ name }) => name === 'new.json');
	const siteVersionKey = await readSiteVersionKey(errors);
	const newVersionKey = isRecord(newFile?.data) ? nonEmptyString(newFile.data.VersionKey) : undefined;
	if (!newVersionKey) {
		errors.push('new.json must declare VersionKey');
	} else if (siteVersionKey && normalizeVersionLabel(siteVersionKey) !== normalizeVersionLabel(newVersionKey)) {
		errors.push(`site version_key ${siteVersionKey} does not match new.json VersionKey ${newVersionKey}`);
	}
	if (manifest && isRecord(manifest) && manifest.gameVersion && newVersionKey &&
		normalizeVersionLabel(manifest.gameVersion) !== normalizeVersionLabel(newVersionKey)) {
		errors.push(`manifest gameVersion ${String(manifest.gameVersion)} does not match new.json VersionKey ${newVersionKey}`);
	}

	const iconCount = await validatePngReferences(parsedFiles, imageDir, errors);
	if (errors.length) throw new Error(errors.join('\n'));
	const images = await validateImages(imageDir, parsedFiles, newVersionKey, options.allowLegacy || options.mode === 'check');
	const siteJsonNames = (await readdir(siteDataDir, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !IGNORED_DATA_NAMES.has(entry.name))
		.map((entry) => entry.name)
		.sort();
	for (const name of siteJsonNames) {
		if (!(await isFile(path.join(jsonDir, name)))) errors.push(`extractor output is missing site data file ${name}`);
	}

	if (errors.length > 0) {
		throw new Error(errors.join('\n'));
	}

	process.stdout.write(`Validated ${parsedFiles.length} JSON files, ${iconCount} route-eligible PNG references, and release ${newVersionKey}.\n`);
	if (options.mode === 'sync') {
		const jsonNames = (await readdir(jsonDir)).filter(n => n.endsWith('.json'));
		await publishImport(SITE_ROOT, sourceRoot, jsonNames, [...images.names, ...(images.manifest ? ['manifest.json'] : [])], undefined,
			{'data/json': manifest?.outputs || {}, 'data/images': images.hashes});
	} else {
		process.stdout.write('Check complete; no files were written.\n');
	}
};

main().catch((error) => {
	console.error(`[data-import] ${error.message}`);
	process.exitCode = 1;
});
