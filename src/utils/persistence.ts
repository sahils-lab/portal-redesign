import type { WidgetConfig } from "../types/widget";

const DRAFT_KEY = "portal-redesign:draft";
const PUBLISHED_KEY = "portal-redesign:published";

export interface PersistedPageDoc {
	id: string;
	name: string;
	widgets: WidgetConfig[];
}

export interface PersistedDraft {
	pageTitle: string;
	pages: PersistedPageDoc[];
	activePageId: string;
}

export interface PersistedPublished {
	/** Snapshots are per-page — publishing one page doesn't touch another's last-published state. */
	pages: Record<string, WidgetConfig[]>;
}

function load<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function save<T>(key: string, value: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Quota exceeded / storage disabled — non-critical for a prototype, fail silently.
	}
}

/**
 * "Save" persists the live draft; "Publish" persists a separate snapshot —
 * mirroring the real product's draft/published split rather than treating
 * localStorage as one blob. Deliberately two keys, not one with a flag,
 * since draft and published are genuinely independent copies of the data
 * (that's the whole point being demonstrated).
 */
export const draftStorage = {
	load: () => load<PersistedDraft>(DRAFT_KEY),
	save: (draft: PersistedDraft) => save(DRAFT_KEY, draft),
};

export const publishedStorage = {
	load: () => load<PersistedPublished>(PUBLISHED_KEY),
	save: (published: PersistedPublished) => save(PUBLISHED_KEY, published),
};
