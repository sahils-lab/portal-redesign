import { useState, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import type { DeviceMode } from "./deviceModes";
import { PageMenu, type Page } from "./PageMenu";

export type SaveStatus = "saved" | "saving" | "unsaved";

export function BuilderHeader({
	title,
	onTitleChange,
	published,
	stencilOpen,
	onToggleStencil,
	propertiesOpen,
	onToggleProperties,
	onPresent,
	onPreview,
	previewMode,
	onSave,
	onPublish,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	zoom,
	onZoomIn,
	onZoomOut,
	onOpenCommandPalette,
	saveStatus,
	deviceMode,
	onDeviceModeChange,
	pages,
	activePageId,
	onSwitchPage,
	onAddPage,
	onRenamePage,
	onDeletePage,
	onDeleteEverything,
	bookmarksSlot,
}: {
	title: string;
	onTitleChange: (title: string) => void;
	published: boolean;
	stencilOpen: boolean;
	onToggleStencil: () => void;
	propertiesOpen: boolean;
	onToggleProperties: () => void;
	onPresent: () => void;
	onPreview: () => void;
	previewMode: boolean;
	onSave: () => void;
	onPublish: () => void;
	onUndo: () => void;
	onRedo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	zoom: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onOpenCommandPalette: () => void;
	saveStatus: SaveStatus;
	deviceMode: DeviceMode;
	onDeviceModeChange: (mode: DeviceMode) => void;
	pages: Page[];
	activePageId: string;
	onSwitchPage: (id: string) => void;
	onAddPage: () => void;
	onRenamePage: (id: string, name: string) => void;
	onDeletePage: (id: string) => void;
	/** Full factory reset — every page's widgets, saved draft/published, global filters, and bookmarks. Irreversible, unlike everything else in this header (Undo/Redo cover the rest), so it's placed away from the primary Save/Publish cluster and its own click handler confirms before acting. */
	onDeleteEverything: () => void;
	bookmarksSlot?: ReactNode;
}) {
	const [editing, setEditing] = useState(false);

	return (
		<div className="builder-header">
			<div className="builder-header__row">
				<button type="button" className="icon-button" aria-label="Back">
					←
				</button>
				{editing ? (
					<input
						className="builder-header__title-input"
						value={title}
						autoFocus
						onChange={(e) => onTitleChange(e.target.value)}
						onBlur={() => setEditing(false)}
						onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
					/>
				) : (
					<button type="button" className="builder-header__title" onClick={() => setEditing(true)}>
						{title}
						<span className="builder-header__edit-icon">✎</span>
					</button>
				)}

				<span className={`save-status save-status--${saveStatus}`}>
					{saveStatus === "saving" && "Saving…"}
					{saveStatus === "saved" && (
						<>
							<Icon name="check" size={11} /> All changes saved
						</>
					)}
					{saveStatus === "unsaved" && "Unsaved changes"}
				</span>

				<div className="builder-header__spacer" />

				<span className={`status-badge ${published ? "status-badge--published" : "status-badge--draft"}`}>
					{published ? "Published" : "Not published"}
				</span>
				<button type="button" className="icon-button" aria-label="More options">
					⋮
				</button>
				<button type="button" className="btn btn--outline">
					Share
				</button>
				<button type="button" className="btn btn--outline-primary" onClick={onPresent}>
					<Icon name="expand" size={13} /> Present
				</button>
				<button
					type="button"
					className={previewMode ? "btn btn--primary" : "btn btn--outline-primary"}
					onClick={onPreview}
					title={published ? "View the published version" : "Nothing published yet"}
				>
					{previewMode ? "Editing" : "Preview"}
				</button>
				<button type="button" className="btn btn--outline-primary">
					Version history
				</button>
				<button type="button" className="btn btn--outline-primary" onClick={onPublish}>
					Publish
				</button>
				<button type="button" className="btn btn--outline-primary" onClick={onSave}>
					Save
				</button>
			</div>

			<div className="builder-header__row builder-header__row--toolbar">
				<button type="button" className="link-btn" onClick={onToggleStencil}>
					{stencilOpen ? "Hide Stencil" : "Show Stencil"}
				</button>
				<PageMenu
					pages={pages}
					activePageId={activePageId}
					onSwitch={onSwitchPage}
					onAdd={onAddPage}
					onRename={onRenamePage}
					onDelete={onDeletePage}
				/>
				<button type="button" className="command-trigger" onClick={onOpenCommandPalette}>
					<Icon name="query" size={13} /> Quick actions <kbd>⌘K</kbd>
				</button>
				{bookmarksSlot}
				<div className="builder-header__spacer" />
				<select
					className="select-sm"
					value={deviceMode}
					onChange={(e) => onDeviceModeChange(e.target.value as DeviceMode)}
				>
					<option value="desktop">Desktop</option>
					<option value="tablet">Tablet (768px)</option>
					<option value="mobile">Mobile (390px)</option>
				</select>
				<button type="button" className="icon-button" aria-label="Zoom out" onClick={onZoomOut} disabled={zoom <= 0.5}>
					⊖
				</button>
				<span className="zoom-readout">{Math.round(zoom * 100)}%</span>
				<button type="button" className="icon-button" aria-label="Zoom in" onClick={onZoomIn} disabled={zoom >= 1.5}>
					⊕
				</button>
				<button type="button" className="icon-button" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
					↶
				</button>
				<button type="button" className="icon-button" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
					↷
				</button>
				<div className="builder-header__spacer" />
				<button type="button" className="btn btn--primary btn--sm" onClick={onAddPage}>
					<Icon name="plus" size={14} /> Add page
				</button>
				<button type="button" className="link-btn" onClick={onToggleProperties}>
					{propertiesOpen ? "Hide Properties" : "Show Properties"}
				</button>
				<button
					type="button"
					className="btn btn--outline-danger btn--sm"
					onClick={onDeleteEverything}
					title="Delete every page's widgets, saved draft/published, filters, and bookmarks"
				>
					<Icon name="trash" size={13} /> Delete everything
				</button>
			</div>
		</div>
	);
}
