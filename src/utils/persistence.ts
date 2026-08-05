import type { WidgetConfig } from "../types/widget";

const DRAFT_KEY = "portal-redesign:draft";
const PUBLISHED_KEY = "portal-redesign:published";

export interface PersistedPage {
	pageTitle: string;
	widgets: WidgetConfig[];
}

function load(key: string): PersistedPage | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as PersistedPage;
	} catch {
		return null;
	}
}

function save(key: string, page: PersistedPage): void {
	try {
		localStorage.setItem(key, JSON.stringify(page));
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
	load: () => load(DRAFT_KEY),
	save: (page: PersistedPage) => save(DRAFT_KEY, page),
};

export const publishedStorage = {
	load: () => load(PUBLISHED_KEY),
	save: (page: PersistedPage) => save(PUBLISHED_KEY, page),
};
