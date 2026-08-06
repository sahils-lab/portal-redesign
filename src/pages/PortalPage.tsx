import { useEffect, useState } from "react";
import type { WidgetConfig } from "../types/widget";
import type { EntityType } from "../types/analytics";
import { usePortalContext } from "../context/PortalContext";
import { useGlobalFilters } from "../context/FilterContext";
import { PortalCanvas } from "../components/PortalCanvas";
import { GlobalFilterBar } from "../components/filters/GlobalFilterBar";
import { DrillThroughPage } from "./DrillThroughPage";
import { BookmarksMenu } from "../components/builder/BookmarksMenu";
import type { BookmarkSnapshot } from "../utils/bookmarks";
import { StencilPanel } from "../components/builder/StencilPanel";
import { PropertiesPanel } from "../components/builder/PropertiesPanel";
import { BuilderHeader } from "../components/builder/BuilderHeader";
import { createWidgetFromStencil } from "../components/builder/createWidget";
import { stencilSections, type StencilItem } from "../components/builder/stencilConfig";
import { Icon } from "../components/icons/Icon";
import { useWidgetHistory } from "../hooks/useWidgetHistory";
import { draftStorage, publishedStorage } from "../utils/persistence";
import { CommandPalette, type Command } from "../components/builder/CommandPalette";
import type { SaveStatus } from "../components/builder/BuilderHeader";
import { deviceWidths, type DeviceMode } from "../components/builder/deviceModes";
import type { Page } from "../components/builder/PageMenu";

interface PortalPageDoc extends Page {
	widgets: WidgetConfig[];
}

const AUTOSAVE_DELAY_MS = 1200;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

function findStencilItem(key: string): StencilItem | undefined {
	for (const section of stencilSections) {
		const item = section.items.find((i) => i.key === key);
		if (item) return item;
	}
	return undefined;
}

const initialWidgets: WidgetConfig[] = [
	{
		id: "w0",
		type: "title",
		title: "Section title",
		grid: { x: 0, y: 0, w: 8, h: 1 },
		text: "Q3 Financial Overview",
		level: "h2",
	},
	{
		id: "w1",
		type: "kpi",
		title: "Revenue",
		grid: { x: 0, y: 1, w: 2, h: 1 },
		metricId: "metric-revenue",
		valueFormat: "currency",
	},
	{
		id: "w2",
		type: "metric",
		title: "Revenue by Region",
		grid: { x: 2, y: 1, w: 4, h: 2 },
		metricId: "metric-revenue",
		rowGroups: ["region"],
		valueCols: ["Q1", "Q2", "Q3"],
	},
	{
		id: "w3",
		type: "report",
		title: "Monthly Statement",
		grid: { x: 0, y: 2, w: 2, h: 2 },
		statementId: "statement-monthly",
	},
	{
		id: "w4",
		type: "recon",
		title: "Bank Reconciliation",
		grid: { x: 6, y: 1, w: 2, h: 2 },
		reconId: "recon-bank",
	},
	{
		id: "w5",
		type: "info",
		title: "Info note",
		grid: { x: 2, y: 4, w: 4, h: 1 },
		message: "Data refreshes automatically every 15 minutes.",
		severity: "info",
	},
	{
		id: "w6",
		type: "alert",
		title: "Alert",
		grid: { x: 6, y: 4, w: 2, h: 1 },
		message: "2 reconciliation items need review.",
		severity: "warning",
	},
	{
		id: "w7",
		type: "chart",
		title: "Revenue Trend",
		grid: { x: 0, y: 5, w: 4, h: 2 },
		chartType: "line",
		measure: "revenue",
		dimension: "date",
		dateGrain: "month",
	},
	{
		id: "w8",
		type: "table",
		title: "Top Sellers",
		grid: { x: 4, y: 5, w: 4, h: 2 },
		dimension: "seller",
		measures: ["revenue", "orders"],
	},
];

let duplicateCounter = 0;

/** True while focus is in a text input/select — so Delete/Backspace there edits text, not widgets. */
function isTypingTarget(el: EventTarget | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function PortalPage() {
	const { dataMode, setDataMode, crossFilters, restoreCrossFilters } = usePortalContext();
	const { filters: globalFilters, applyAll: applyGlobalFilterSet } = useGlobalFilters();

	const [pageTitle, setPageTitle] = useState("Test2");
	const [pages, setPages] = useState<PortalPageDoc[]>([
		{ id: "page-1", name: "Page 1", widgets: initialWidgets },
	]);
	const [activePageId, setActivePageId] = useState("page-1");
	const history = useWidgetHistory(initialWidgets);
	const widgets = history.widgets;

	// Single history instance is reused across pages via `history.replace()` on
	// switch — undo/redo history resets per page-switch (accepted tradeoff,
	// documented in the design doc) rather than keeping N independent stacks.
	useEffect(() => {
		setPages((prev) => prev.map((p) => (p.id === activePageId ? { ...p, widgets } : p)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [widgets]);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [toast, setToast] = useState<string | null>(null);
	const [stencilOpen, setStencilOpen] = useState(true);
	const [propertiesOpen, setPropertiesOpen] = useState(true);
	const [presentationMode, setPresentationMode] = useState(false);

	// Publish/preview: `publishedWidgets` is an independent SNAPSHOT of the
	// draft, not a live reference — editing the draft after publishing does
	// NOT change what Preview shows until you publish again. This is the
	// prototype's answer to the real codebase's documented bug
	// (portal-published-snapshot-stale-hide-unshared-pages-flag.md), where a
	// flag was read from a stale published snapshot by accident; here the
	// snapshot-vs-draft split is explicit and intentional, not accidental.
	// Keyed by page id — publishing one page doesn't touch another page's last-published snapshot.
	const [publishedPages, setPublishedPages] = useState<Record<string, WidgetConfig[]>>({});
	const publishedWidgets = publishedPages[activePageId] ?? null;
	const published = publishedWidgets !== null;
	const [previewMode, setPreviewMode] = useState(false);
	const [dataModeBeforePreview, setDataModeBeforePreview] = useState<typeof dataMode | null>(null);
	const [zoom, setZoom] = useState(1);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
	const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
	const [drillThrough, setDrillThrough] = useState<{ entityType: EntityType; entityId: string } | null>(null);

	const openDrillThrough = (entityType: EntityType, entityId: string) => setDrillThrough({ entityType, entityId });
	const closeDrillThrough = () => setDrillThrough(null);

	// Bookmarks capture "the view", not the widgets themselves — global
	// filters, active cross-filters, which page, and live/published mode.
	const buildBookmarkSnapshot = (): BookmarkSnapshot => ({
		globalFilters,
		crossFilters,
		activePageId,
		dataMode,
	});
	const applyBookmarkSnapshot = (snapshot: BookmarkSnapshot) => {
		applyGlobalFilterSet(snapshot.globalFilters);
		restoreCrossFilters(snapshot.crossFilters);
		setDataMode(snapshot.dataMode);
		if (snapshot.activePageId !== activePageId) switchToPage(snapshot.activePageId);
		showToast("View restored");
	};

	// Load persisted draft + published snapshots once on mount.
	useEffect(() => {
		const draft = draftStorage.load();
		if (draft && draft.pages.length > 0) {
			setPageTitle(draft.pageTitle);
			setPages(draft.pages);
			const active = draft.pages.find((p) => p.id === draft.activePageId) ?? draft.pages[0];
			history.replace(active.widgets);
			setActivePageId(active.id);
		}
		const pub = publishedStorage.load();
		if (pub) {
			setPublishedPages(pub.pages);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const showToast = (message: string) => {
		setToast(message);
		window.setTimeout(() => setToast(null), 2500);
	};

	const handleAddWidget = (item: StencilItem) => {
		const created = createWidgetFromStencil(item, widgets);
		if (!created) {
			showToast(`"${item.label}" isn't implemented in this prototype yet.`);
			return;
		}
		history.set([...widgets, created]);
		setSelectedIds(new Set([created.id]));
	};

	/** Used by canvas drop handling — stencil items are identified by key over the DataTransfer wire format. */
	const handleAddWidgetByKey = (key: string) => {
		const item = findStencilItem(key);
		if (item) handleAddWidget(item);
	};

	const handleDeleteWidget = (id: string) => {
		history.set(widgets.filter((w) => w.id !== id));
		setSelectedIds((current) => {
			const next = new Set(current);
			next.delete(id);
			return next;
		});
	};

	const handleDeleteSelected = () => {
		if (selectedIds.size === 0) return;
		history.set(widgets.filter((w) => !selectedIds.has(w.id)));
		setSelectedIds(new Set());
	};

	const handleDuplicateWidget = (id: string) => {
		const source = widgets.find((w) => w.id === id);
		if (!source) return;
		duplicateCounter += 1;
		const copy: WidgetConfig = {
			...source,
			id: `w-dup-${duplicateCounter}`,
			title: `${source.title} (copy)`,
			grid: { ...source.grid, x: Math.min(source.grid.x + 1, 8 - source.grid.w), y: source.grid.y + source.grid.h },
		};
		history.set([...widgets, copy]);
		setSelectedIds(new Set([copy.id]));
	};

	const handleUpdateWidget = (id: string, patch: Partial<WidgetConfig>) => {
		history.set(widgets.map((w) => (w.id === id ? ({ ...w, ...patch } as WidgetConfig) : w)));
	};

	const handleMoveWidget = (id: string, position: { x: number; y: number }) => {
		history.set(
			widgets.map((w) => (w.id === id ? { ...w, grid: { ...w.grid, x: position.x, y: position.y } } : w))
		);
	};

	const handleResizeWidget = (id: string, size: { w: number; h: number }) => {
		history.set(widgets.map((w) => (w.id === id ? { ...w, grid: { ...w.grid, w: size.w, h: size.h } } : w)));
	};

	const handleSave = () => {
		draftStorage.save({ pageTitle, pages, activePageId });
		setSaveStatus("saved");
		showToast("Draft saved");
	};

	const handlePublish = () => {
		const snapshot = JSON.parse(JSON.stringify(widgets)) as WidgetConfig[];
		const nextPublishedPages = { ...publishedPages, [activePageId]: snapshot };
		setPublishedPages(nextPublishedPages);
		publishedStorage.save({ pages: nextPublishedPages });
		showToast("Published successfully");
	};

	const switchToPage = (id: string) => {
		if (id === activePageId) return;
		const target = pages.find((p) => p.id === id);
		if (!target) return;
		history.replace(target.widgets);
		setActivePageId(id);
		setSelectedIds(new Set());
	};

	const addPage = () => {
		const id = `page-${Date.now()}`;
		const newPage: PortalPageDoc = { id, name: `Page ${pages.length + 1}`, widgets: [] };
		setPages((prev) => [...prev, newPage]);
		history.replace([]);
		setActivePageId(id);
		setSelectedIds(new Set());
	};

	const renamePage = (id: string, name: string) => {
		setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
	};

	const deletePage = (id: string) => {
		if (pages.length <= 1) return;
		const next = pages.filter((p) => p.id !== id);
		setPages(next);
		if (id === activePageId) {
			const fallback = next[0];
			history.replace(fallback.widgets);
			setActivePageId(fallback.id);
			setSelectedIds(new Set());
		}
	};

	const enterPreview = () => {
		if (!publishedWidgets) {
			showToast("Nothing published yet — click Publish first.");
			return;
		}
		setDataModeBeforePreview(dataMode);
		setDataMode("published");
		setPreviewMode(true);
		setSelectedIds(new Set());
	};

	const exitPreview = () => {
		setPreviewMode(false);
		if (dataModeBeforePreview) setDataMode(dataModeBeforePreview);
	};

	const enterPresentation = () => {
		setPresentationMode(true);
		document.documentElement.requestFullscreen?.().catch(() => {});
	};

	const exitPresentation = () => {
		setPresentationMode(false);
		if (document.fullscreenElement) {
			document.exitFullscreen?.().catch(() => {});
		}
	};

	// Stay in sync if the user exits fullscreen via the browser's own UI/Escape
	// rather than our "Exit presentation" button.
	useEffect(() => {
		const handleFullscreenChange = () => {
			if (!document.fullscreenElement) setPresentationMode(false);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
	const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));

	// Auto-save: any draft change marks "Unsaved changes" immediately, then
	// debounces a real localStorage write so rapid edits (e.g. dragging)
	// don't hammer it. The manual Save button still exists for an explicit,
	// immediate write.
	useEffect(() => {
		setSaveStatus("unsaved");
		const timer = window.setTimeout(() => {
			setSaveStatus("saving");
			draftStorage.save({ pageTitle, pages, activePageId });
			setSaveStatus("saved");
		}, AUTOSAVE_DELAY_MS);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [widgets, pageTitle, pages, activePageId]);

	// Powers the Cmd/Ctrl+K command palette — every widget type that's
	// actually wired up, plus the same actions available in the toolbar,
	// searchable in one place instead of hunting through menus.
	const commands: Command[] = [
		...stencilSections.flatMap((section) =>
			section.items
				.filter((item) => item.widgetType)
				.map((item) => ({
					id: `add-${item.key}`,
					label: `Add ${item.label}`,
					group: "Insert",
					action: () => handleAddWidget(item),
				}))
		),
		{ id: "undo", label: "Undo", group: "Edit", action: () => history.undo() },
		{ id: "redo", label: "Redo", group: "Edit", action: () => history.redo() },
		{
			id: "delete-selected",
			label: "Delete selected widget(s)",
			group: "Edit",
			action: handleDeleteSelected,
		},
		{ id: "save", label: "Save draft", group: "File", action: handleSave },
		{ id: "publish", label: "Publish", group: "File", action: handlePublish },
		{
			id: "preview",
			label: previewMode ? "Exit preview" : "Preview published version",
			group: "View",
			action: () => (previewMode ? exitPreview() : enterPreview()),
		},
		{ id: "present", label: "Enter presentation mode", group: "View", action: enterPresentation },
		{
			id: "toggle-stencil",
			label: stencilOpen ? "Hide Stencil panel" : "Show Stencil panel",
			group: "View",
			action: () => setStencilOpen((v) => !v),
		},
		{
			id: "toggle-properties",
			label: propertiesOpen ? "Hide Properties panel" : "Show Properties panel",
			group: "View",
			action: () => setPropertiesOpen((v) => !v),
		},
		{ id: "zoom-in", label: "Zoom in", group: "View", action: zoomIn },
		{ id: "zoom-out", label: "Zoom out", group: "View", action: zoomOut },
		{ id: "add-page", label: "Add page", group: "Pages", action: addPage },
		...pages
			.filter((p) => p.id !== activePageId)
			.map((p) => ({
				id: `switch-page-${p.id}`,
				label: `Go to page: ${p.name}`,
				group: "Pages",
				action: () => switchToPage(p.id),
			})),
	];

	const handleSelect = (id: string, additive: boolean) => {
		setSelectedIds((current) => {
			if (!additive) return new Set([id]);
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// Keyboard shortcuts: Cmd/Ctrl+K opens the command palette (works even
	// while typing, matching the usual convention for this shortcut).
	// Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z (or Ctrl+Y) redo, Delete/Backspace
	// removes selected widgets, Escape closes the palette if open, else exits
	// presentation/preview if active, else clears selection.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;

			if (mod && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setCommandPaletteOpen((v) => !v);
				return;
			}
			if (e.key === "Escape" && commandPaletteOpen) {
				setCommandPaletteOpen(false);
				return;
			}

			if (isTypingTarget(e.target)) return;

			if (mod && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) history.redo();
				else history.undo();
				return;
			}
			if (mod && e.key.toLowerCase() === "y") {
				e.preventDefault();
				history.redo();
				return;
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				if (selectedIds.size > 0) {
					e.preventDefault();
					handleDeleteSelected();
				}
			} else if (e.key === "Escape") {
				if (presentationMode) exitPresentation();
				else if (previewMode) exitPreview();
				else setSelectedIds(new Set());
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedIds, presentationMode, previewMode, widgets, commandPaletteOpen]);

	const displayedWidgets = previewMode && publishedWidgets ? publishedWidgets : widgets;
	const readOnly = previewMode || presentationMode;

	const selectedWidget =
		!readOnly && selectedIds.size === 1 ? (widgets.find((w) => w.id === [...selectedIds][0]) ?? null) : null;

	return (
		<div
			className={[
				"portal-builder",
				presentationMode ? "portal-builder--presentation" : "",
				previewMode ? "portal-builder--preview" : "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			{!presentationMode && !drillThrough && (
				<BuilderHeader
					title={pageTitle}
					onTitleChange={setPageTitle}
					published={published}
					stencilOpen={stencilOpen}
					onToggleStencil={() => setStencilOpen((v) => !v)}
					propertiesOpen={propertiesOpen}
					onToggleProperties={() => setPropertiesOpen((v) => !v)}
					onPresent={enterPresentation}
					onPreview={previewMode ? exitPreview : enterPreview}
					previewMode={previewMode}
					onSave={handleSave}
					onPublish={handlePublish}
					onUndo={history.undo}
					onRedo={history.redo}
					canUndo={history.canUndo}
					canRedo={history.canRedo}
					zoom={zoom}
					onZoomIn={zoomIn}
					onZoomOut={zoomOut}
					onOpenCommandPalette={() => setCommandPaletteOpen(true)}
					saveStatus={saveStatus}
					deviceMode={deviceMode}
					onDeviceModeChange={setDeviceMode}
					pages={pages}
					activePageId={activePageId}
					onSwitchPage={switchToPage}
					onAddPage={addPage}
					onRenamePage={renamePage}
					onDeletePage={deletePage}
					bookmarksSlot={<BookmarksMenu getSnapshot={buildBookmarkSnapshot} onApply={applyBookmarkSnapshot} />}
				/>
			)}
			{drillThrough ? (
				<DrillThroughPage entityType={drillThrough.entityType} entityId={drillThrough.entityId} onBack={closeDrillThrough} />
			) : (
				<>
					{previewMode && (
						<div className="preview-banner">
							<Icon name="expand" size={13} /> Viewing the published version — this reflects your last Publish, not
							unsaved edits.
						</div>
					)}
					{!presentationMode && <GlobalFilterBar />}
					<div className="portal-builder__body">
						<StencilPanel open={stencilOpen && !readOnly} onAddWidget={handleAddWidget} />
						<PortalCanvas
							widgets={displayedWidgets}
							selectedIds={selectedIds}
							onSelect={handleSelect}
							onDelete={handleDeleteWidget}
							onDuplicate={handleDuplicateWidget}
							onDropWidgetKey={handleAddWidgetByKey}
							onMoveWidget={handleMoveWidget}
							onResizeWidget={handleResizeWidget}
							readOnly={readOnly}
							zoom={zoom}
							deviceWidth={deviceWidths[deviceMode]}
							onOpenDrillThrough={openDrillThrough}
						/>
						<PropertiesPanel open={propertiesOpen && !readOnly} selected={selectedWidget} onUpdate={handleUpdateWidget} />
					</div>
				</>
			)}
			{presentationMode && (
				<button type="button" className="presentation-exit" onClick={exitPresentation}>
					<Icon name="collapse" size={14} /> Exit presentation (Esc)
				</button>
			)}
			{toast && <div className="toast">{toast}</div>}
			{commandPaletteOpen && <CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} />}
		</div>
	);
}
