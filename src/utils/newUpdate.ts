import newUpdate from '../datav2/new.json';
import type { Item } from './lookup';

export type NewUpdateItem = Item & {
	SourceFile?: string;
	Change?: string;
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

export function getNewUpdatePayload(): NewUpdatePayload {
	return payload;
}

export function formatVersionLabel(versionKey: string | null | undefined): string {
	if (!versionKey) return 'Unknown';
	const match = versionKey.match(/^(\d+)\.(\d+)/);
	if (!match) return versionKey;
	return `${match[1]}.${match[2]}`;
}
