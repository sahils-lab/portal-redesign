import { useState } from "react";
import { Icon } from "../icons/Icon";
import { loadBookmarks, createBookmark, deleteBookmark, type Bookmark, type BookmarkSnapshot } from "../../utils/bookmarks";

/**
 * "Let users save their preferred dashboard state, filters, and layouts" —
 * Bookmarks. Captures the current global filters, active cross-filters,
 * page, and live/published mode under a name; applying one restores all of
 * it in one click instead of re-picking every filter by hand.
 */
export function BookmarksMenu({
	getSnapshot,
	onApply,
}: {
	getSnapshot: () => BookmarkSnapshot;
	onApply: (snapshot: BookmarkSnapshot) => void;
}) {
	const [open, setOpen] = useState(false);
	const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks());
	const [naming, setNaming] = useState(false);
	const [name, setName] = useState("");

	const handleSave = () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setBookmarks(createBookmark(trimmed, getSnapshot()));
		setName("");
		setNaming(false);
	};

	return (
		<div className="page-menu">
			<button type="button" className="btn btn--outline-primary btn--sm" onClick={() => setOpen((v) => !v)}>
				<Icon name="filebox" size={13} /> Bookmarks
				{bookmarks.length > 0 && <span className="msf__count">{bookmarks.length}</span>}
			</button>
			{open && (
				<>
					<div className="page-menu__backdrop" onClick={() => setOpen(false)} />
					<div className="page-menu__dropdown bookmarks-menu__dropdown">
						{bookmarks.length === 0 && !naming && <p className="chart-widget__empty">No saved views yet.</p>}
						{bookmarks.map((b) => (
							<div key={b.id} className="page-menu__item">
								<button
									type="button"
									className="page-menu__item-label"
									onClick={() => {
										onApply(b);
										setOpen(false);
									}}
								>
									{b.name}
								</button>
								<div className="page-menu__item-actions">
									<button
										type="button"
										aria-label={`Delete bookmark ${b.name}`}
										onClick={() => setBookmarks(deleteBookmark(b.id))}
									>
										✕
									</button>
								</div>
							</div>
						))}
						{naming ? (
							<input
								className="page-menu__rename-input"
								autoFocus
								placeholder="View name…"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSave();
									if (e.key === "Escape") setNaming(false);
								}}
								onBlur={handleSave}
							/>
						) : (
							<button type="button" className="page-menu__add" onClick={() => setNaming(true)}>
								<Icon name="plus" size={13} /> Save current view
							</button>
						)}
					</div>
				</>
			)}
		</div>
	);
}
