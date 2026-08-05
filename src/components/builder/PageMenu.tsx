import { useState } from "react";
import { Icon } from "../icons/Icon";

export interface Page {
	id: string;
	name: string;
}

/**
 * The "Page ▾" dropdown was decorative before — a static button that opened
 * nothing. Tableau's core organizing concept for a dashboard is multiple
 * sheets/pages; this is the working version: switch, rename (inline), add,
 * delete (can't delete the last page).
 */
export function PageMenu({
	pages,
	activePageId,
	onSwitch,
	onAdd,
	onRename,
	onDelete,
}: {
	pages: Page[];
	activePageId: string;
	onSwitch: (id: string) => void;
	onAdd: () => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const activePage = pages.find((p) => p.id === activePageId);

	return (
		<div className="page-menu">
			<button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen((v) => !v)}>
				{activePage?.name ?? "Page"} <Icon name="chevron-down" size={14} />
			</button>
			{open && (
				<>
					<div className="page-menu__backdrop" onClick={() => setOpen(false)} />
					<div className="page-menu__dropdown">
						{pages.map((page) => (
							<div
								key={page.id}
								className={page.id === activePageId ? "page-menu__item page-menu__item--active" : "page-menu__item"}
							>
								{renamingId === page.id ? (
									<input
										className="page-menu__rename-input"
										autoFocus
										defaultValue={page.name}
										onBlur={(e) => {
											onRename(page.id, e.target.value.trim() || page.name);
											setRenamingId(null);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") e.currentTarget.blur();
											if (e.key === "Escape") setRenamingId(null);
										}}
									/>
								) : (
									<button
										type="button"
										className="page-menu__item-label"
										onClick={() => {
											onSwitch(page.id);
											setOpen(false);
										}}
									>
										{page.id === activePageId && <Icon name="check" size={12} />}
										{page.name}
									</button>
								)}
								<div className="page-menu__item-actions">
									<button
										type="button"
										aria-label="Rename page"
										onClick={() => setRenamingId(page.id)}
									>
										✎
									</button>
									{pages.length > 1 && (
										<button type="button" aria-label="Delete page" onClick={() => onDelete(page.id)}>
											✕
										</button>
									)}
								</div>
							</div>
						))}
						<button
							type="button"
							className="page-menu__add"
							onClick={() => {
								onAdd();
								setOpen(false);
							}}
						>
							<Icon name="plus" size={13} /> New page
						</button>
					</div>
				</>
			)}
		</div>
	);
}
