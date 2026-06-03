import newUpdate from '../datav2/new.json';
import { formatVersionLabel } from './newUpdate';

export type ItemUpdateMeta = {
	kind: 'added' | 'changed';
	versionLabel: string;
	previousVersionLabel: string;
	changedFields: string[];
	previous?: Record<string, unknown>;
	current?: Record<string, unknown>;
};

type NewUpdatePayload = {
	VersionKey: string;
	PreviousVersionKey: string | null;
	Items: Array<Record<string, unknown>>;
	ChangedItems: Array<Record<string, unknown>>;
};

const payload = newUpdate as NewUpdatePayload;

const FIELD_LABELS: Record<string, string> = {
	Name: 'Name',
	Group: 'Group',
	Description: 'Description',
	Icon: 'Icon',
	IconPath: 'Icon texture',
	BaseValueUnits: 'Value (units)',
	Rarity: 'Rarity',
	Legality: 'Legality',
	RequiredItems: 'Recipe',
	TradeCategory: 'Trade category',
	ProductCategory: 'Product category',
	MaxStackSize: 'Stack size',
	Consumable: 'Consumable',
};

const SKIP_DIFF_DISPLAY = new Set([
	'SourceFile',
	'Change',
	'Previous',
	'ChangedFields',
	'Slug',
	'CdnUrl',
	'HeroIconPath',
]);

function formatFieldLabel(field: string): string {
	return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1').trim();
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) {
		return '—';
	}
	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}
	if (typeof value === 'string') {
		return value.length > 200 ? `${value.slice(0, 200)}…` : value;
	}
	if (Array.isArray(value) || typeof value === 'object') {
		return JSON.stringify(value);
	}
	return String(value);
}

const addedById = new Map(payload.Items.map((item) => [String(item.Id), item]));
const changedById = new Map(payload.ChangedItems.map((item) => [String(item.Id), item]));

export function getItemUpdateMeta(id: string): ItemUpdateMeta | null {
	const changed = changedById.get(id);
	if (changed) {
		const fields = (changed.ChangedFields as string[] | undefined) ?? [];
		return {
			kind: 'changed',
			versionLabel: formatVersionLabel(payload.VersionKey),
			previousVersionLabel: formatVersionLabel(payload.PreviousVersionKey),
			changedFields: fields,
			previous: changed.Previous as Record<string, unknown> | undefined,
			current: changed,
		};
	}
	if (addedById.has(id)) {
		return {
			kind: 'added',
			versionLabel: formatVersionLabel(payload.VersionKey),
			previousVersionLabel: formatVersionLabel(payload.PreviousVersionKey),
			changedFields: [],
		};
	}
	return null;
}

export function getUpdateDiffRows(meta: ItemUpdateMeta): Array<{
	field: string;
	before: string;
	after: string;
}> {
	if (meta.kind !== 'changed' || !meta.previous || !meta.current) {
		return [];
	}
	const fields =
		meta.changedFields.length > 0
			? meta.changedFields
			: Object.keys({ ...meta.previous, ...meta.current }).filter(
					(key) => !SKIP_DIFF_DISPLAY.has(key) && meta.previous![key] !== meta.current![key],
				);

	return fields
		.filter((field) => !SKIP_DIFF_DISPLAY.has(field))
		.map((field) => ({
			field: formatFieldLabel(field),
			before: formatValue(meta.previous![field]),
			after: formatValue(meta.current![field]),
		}));
}

/** Item detail pages support ?show_changes=1; arena pet-shop anchors do not. */
export function itemUrlWithShowChanges(path: string): string {
	const [base, hash = ''] = path.split('#');
	if (base === '/creatures/arena' || base.endsWith('/creatures/arena')) {
		return hash ? `${base}#${hash}` : base;
	}
	const pathOnly = base.split('?')[0];
	return `${pathOnly}?show_changes=1${hash ? `#${hash}` : ''}`;
}
