import type { GlobalFilters } from "../types/analytics";
import type { CrossFilter } from "../context/PortalContext";
import type { DataMode } from "../types/widget";

const STORAGE_KEY = "portal-redesign:bookmarks";

/** Everything a bookmark needs to restore "the view I was looking at" — global filters, active click-filters, which page, and live vs published. Deliberately NOT the widgets themselves (that's the page's job, not a saved view's). */
export interface BookmarkSnapshot {
	globalFilters: GlobalFilters;
	crossFilters: CrossFilter[];
	activePageId: string;
	dataMode: DataMode;
}

export interface Bookmark extends BookmarkSnapshot {
	id: string;
	name: string;
	createdAt: string;
}

export function loadBookmarks(): Bookmark[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Bookmark[]) : [];
	} catch {
		return [];
	}
}

function save(list: Bookmark[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// Storage disabled — non-critical for a prototype.
	}
}

export function createBookmark(name: string, snapshot: BookmarkSnapshot): Bookmark[] {
	const list = loadBookmarks();
	const next = [...list, { ...snapshot, id: `bm-${Date.now()}`, name, createdAt: new Date().toISOString() }];
	save(next);
	return next;
}

export function deleteBookmark(id: string): Bookmark[] {
	const next = loadBookmarks().filter((b) => b.id !== id);
	save(next);
	return next;
}
