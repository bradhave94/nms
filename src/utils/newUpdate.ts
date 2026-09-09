import newUpdate from '../datav2/new.json';
import type { Item } from './lookup';
import { SITE } from '@config';

export type NewUpdateItem = Item & {
	SourceFile?: string;
	Change?: string;
	ReleaseVariant?: {
		Kind: 'expedition';
		Expedition: number;
		BaseItemId: string;
		BaseItemName: string;
	};
};

export type NewUpdatePayload = {
	VersionKey: string;
	PreviousVersionKey: string | null;
	GeneratedAt: string;
	Summary: {
		Added: number;
		Changed: number;
		Removed: number;
	};
	RemovedIds: Array<{ Id: string; SourceFile: string }>;
	Items: NewUpdateItem[];
	ChangedItems: NewUpdateItem[];
};

const payload = newUpdate as NewUpdatePayload;

const comparableReleaseLabel = (versionKey: string | null | undefined): string => {
	const match = versionKey?.match(/^(\d+)\.(\d+)/);
	return match ? `${Number(match[1])}.${Number(match[2])}` : '';
};

/** Compare major/minor release numbers while tolerating compiler padding. */
export function releaseKeysMatch(
	siteVersionKey: string | null | undefined,
	updateVersionKey: string | null | undefined,
): boolean {
	const siteLabel = comparableReleaseLabel(siteVersionKey);
	const updateLabel = comparableReleaseLabel(updateVersionKey);
	return Boolean(siteLabel && updateLabel && siteLabel === updateLabel);
}

if (!releaseKeysMatch(SITE.version_key, payload.VersionKey) ||
	!releaseKeysMatch(SITE.version.toFixed(2), payload.VersionKey)) {
	throw new Error(
		`Site release metadata (${SITE.version_key}) does not match new.json (${payload.VersionKey}).`,
	);
}

export function getNewUpdatePayload(): NewUpdatePayload {
	return payload;
}

export function formatVersionLabel(versionKey: string | null | undefined): string {
	if (!versionKey) return 'Unknown';
	const match = versionKey.match(/^(\d+)\.(\d+)/);
	if (!match) return versionKey;
	return `${match[1]}.${match[2]}`;
}
