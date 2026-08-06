import { useCallback, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { GridPosition, WidgetConfig } from "../types/widget";
import type { EntityType } from "../types/analytics";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { usePortalContext } from "../context/PortalContext";
import { Icon } from "./icons/Icon";

const STENCIL_DND_TYPE = "application/x-stencil-item";
const CANVAS_WIDGET_DND_TYPE = "application/x-canvas-widget";

const GRID_COLUMNS = 8;
const ROW_HEIGHT_PX = 130;
const GRID_GAP_PX = 16; // matches --space-xl

interface ContextMenuState {
	widgetId: string;
	x: number;
	y: number;
}

interface AlignGuides {
	/** Column indices where a vertical guide line should render (grid-line position, not cell index). */
	vertical: number[];
	/** Row indices where a horizontal guide line should render. */
	horizontal: number[];
}

/**
 * Renders the grid of widgets for a Portal page. Layout positioning
 * (config.grid) is deliberately kept simple here (CSS grid via inline
 * column/row) rather than wiring in a drag-and-drop library — the real
 * Portal had two different grid libraries (svelte-grid, gridstack) plus a
 * third unused dependency; picking exactly one, later, is a separate
 * decision from the data-layer redesign this prototype focuses on.
 *
 * Two distinct drag flows share this one drop zone, disambiguated by
 * DataTransfer type: adding a NEW widget from the stencil (copy, shows a
 * ghost preview snapped to the target cell) vs MOVING an existing widget
 * already on the canvas — the latter also computes smart alignment guides
 * against other widgets' edges. Resizing (bottom-right
 * handle) is a separate pointer-drag interaction, not HTML5 DnD.
 */
export function PortalCanvas({
	widgets,
	selectedIds,
	onSelect,
	onDelete,
	onDuplicate,
	onDropWidgetKey,
	onMoveWidget,
	onResizeWidget,
	readOnly = false,
	zoom = 1,
	deviceWidth = null,
	onOpenDrillThrough,
}: {
	widgets: WidgetConfig[];
	selectedIds: Set<string>;
	onSelect: (id: string, additive: boolean) => void;
	onDelete: (id: string) => void;
	onDuplicate: (id: string) => void;
	onDropWidgetKey: (key: string) => void;
	onMoveWidget: (id: string, position: Pick<GridPosition, "x" | "y">) => void;
	onResizeWidget: (id: string, size: Pick<GridPosition, "w" | "h">) => void;
	/** Preview/presentation mode — disables drag-move, resize, duplicate, delete, and the right-click menu, not just their visual affordances. */
	readOnly?: boolean;
	/** Canvas zoom level (1 = 100%) — scales the grid visually; geometry math below accounts for it so drag/resize stay pixel-accurate at any zoom. */
	zoom?: number;
	/** Constrains the canvas to a device viewport width (Tablet/Mobile preview) — null means unconstrained (Desktop). */
	deviceWidth?: number | null;
	/** Opens the drill-through detail page for a Chart/Table row's entity. */
	onOpenDrillThrough?: (entityType: EntityType, entityId: string) => void;
}) {
	const { dataMode, setDataMode, crossFilters, clearCrossFilterDimension, clearCrossFilters } = usePortalContext();
	const [isDragOver, setIsDragOver] = useState(false);
	const [ghostCell, setGhostCell] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
	const [alignGuides, setAlignGuides] = useState<AlignGuides | null>(null);
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	// The HTML5 DnD spec only exposes dataTransfer.getData() on `drop` (and
	// `dragstart`) — during `dragover` only `.types` is readable, not the
	// actual value, in every browser. Track which widget is being moved via
	// local state (set on dragstart) instead of relying on getData() while
	// computing the ghost/alignment preview during dragover.
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	// getBoundingClientRect() reflects the CSS transform: scale() applied to
	// the grid, so it's already in the same visual/viewport pixel space as
	// clientX/clientY from pointer events — that's what keeps the geometry
	// math below correct at any zoom level without special-casing it, EXCEPT
	// for GRID_GAP_PX/ROW_HEIGHT_PX, which are unscaled constants and need to
	// be multiplied by `zoom` explicitly wherever they're mixed with rect
	// measurements.
	const getColWidth = () => {
		const gridEl = gridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const gap = GRID_GAP_PX * zoom;
		return (rect.width - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
	};

	const cellFromPointer = (clientX: number, clientY: number): { x: number; y: number } | null => {
		const gridEl = gridRef.current;
		const colWidth = getColWidth();
		if (!gridEl || colWidth === null) return null;
		const rect = gridEl.getBoundingClientRect();
		const gap = GRID_GAP_PX * zoom;
		const rowHeight = ROW_HEIGHT_PX * zoom;
		const col = Math.floor((clientX - rect.left) / (colWidth + gap));
		const row = Math.floor((clientY - rect.top) / (rowHeight + gap));
		return { x: col, y: row };
	};

	/** Smart snap lines: highlight when the dragged widget's edges line up with another widget's edges, compared in grid-unit space (column/row indices) rather than pixels, since both sides of the comparison came from the same colWidth math anyway. */
	function computeAlignGuides(ghost: { x: number; y: number; w: number; h: number }, excludeId: string): AlignGuides {
		const vertical = new Set<number>();
		const horizontal = new Set<number>();
		for (const other of widgets) {
			if (other.id === excludeId) continue;
			const oLeft = other.grid.x;
			const oRight = other.grid.x + other.grid.w;
			const oTop = other.grid.y;
			const oBottom = other.grid.y + other.grid.h;
			if (ghost.x === oLeft || ghost.x === oRight) vertical.add(ghost.x);
			if (ghost.x + ghost.w === oLeft || ghost.x + ghost.w === oRight) vertical.add(ghost.x + ghost.w);
			if (ghost.y === oTop || ghost.y === oBottom) horizontal.add(ghost.y);
			if (ghost.y + ghost.h === oTop || ghost.y + ghost.h === oBottom) horizontal.add(ghost.y + ghost.h);
		}
		return { vertical: [...vertical], horizontal: [...horizontal] };
	}

	const isRelevantDrag = (e: DragEvent<HTMLDivElement>) =>
		e.dataTransfer.types.includes(STENCIL_DND_TYPE) || e.dataTransfer.types.includes(CANVAS_WIDGET_DND_TYPE);

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		if (readOnly || !isRelevantDrag(e)) return;
		e.preventDefault();
		const isMove = e.dataTransfer.types.includes(CANVAS_WIDGET_DND_TYPE);
		e.dataTransfer.dropEffect = isMove ? "move" : "copy";
		setIsDragOver(true);

		const cell = cellFromPointer(e.clientX, e.clientY);
		if (!cell) return;

		if (isMove) {
			const movingWidget = widgets.find((w) => w.id === draggingId);
			const w = movingWidget?.grid.w ?? 2;
			const h = movingWidget?.grid.h ?? 2;
			const ghost = { x: Math.max(0, Math.min(cell.x, GRID_COLUMNS - w)), y: Math.max(0, cell.y), w, h };
			setGhostCell(ghost);
			if (movingWidget) setAlignGuides(computeAlignGuides(ghost, movingWidget.id));
			return;
		}

		const w = 2;
		const h = 2;
		setGhostCell({ x: Math.max(0, Math.min(cell.x, GRID_COLUMNS - w)), y: Math.max(0, cell.y), w, h });
		setAlignGuides(null);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
		setGhostCell(null);
		setAlignGuides(null);
	};

	const handleDragEnd = () => {
		setDraggingId(null);
	};

	function computeDropCell(e: DragEvent<HTMLDivElement>, movingWidgetWidth: number): { x: number; y: number } | null {
		const cell = cellFromPointer(e.clientX, e.clientY);
		if (!cell) return null;
		return {
			x: Math.max(0, Math.min(cell.x, GRID_COLUMNS - movingWidgetWidth)),
			y: Math.max(0, cell.y),
		};
	}

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
		setGhostCell(null);
		setAlignGuides(null);
		setDraggingId(null);
		if (readOnly) return;

		const movingId = e.dataTransfer.getData(CANVAS_WIDGET_DND_TYPE);
		if (movingId) {
			const movingWidget = widgets.find((w) => w.id === movingId);
			if (!movingWidget) return;
			const cell = computeDropCell(e, movingWidget.grid.w);
			if (cell) onMoveWidget(movingId, cell);
			return;
		}

		const key = e.dataTransfer.getData(STENCIL_DND_TYPE);
		if (key) onDropWidgetKey(key);
	};

	const handleResizeStart = useCallback(
		(e: ReactPointerEvent<HTMLDivElement>, widget: WidgetConfig) => {
			e.stopPropagation();
			e.preventDefault();
			const colWidth = getColWidth();
			if (colWidth === null) return;
			const gap = GRID_GAP_PX * zoom;
			const rowHeight = ROW_HEIGHT_PX * zoom;

			const startX = e.clientX;
			const startY = e.clientY;
			const startW = widget.grid.w;
			const startH = widget.grid.h;

			const handlePointerMove = (moveEvent: PointerEvent) => {
				const deltaCols = Math.round((moveEvent.clientX - startX) / (colWidth + gap));
				const deltaRows = Math.round((moveEvent.clientY - startY) / (rowHeight + gap));
				const w = Math.max(1, Math.min(startW + deltaCols, GRID_COLUMNS - widget.grid.x));
				const h = Math.max(1, startH + deltaRows);
				onResizeWidget(widget.id, { w, h });
			};

			const handlePointerUp = () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onResizeWidget, zoom]
	);

	return (
		<div className="portal-canvas" onClick={() => setContextMenu(null)}>
			<div className="portal-canvas__toolbar">
				<div className="segmented">
					<button
						type="button"
						className={dataMode === "live" ? "segmented__option segmented__option--active" : "segmented__option"}
						onClick={() => setDataMode("live")}
					>
						Live (draft)
					</button>
					<button
						type="button"
						className={
							dataMode === "published" ? "segmented__option segmented__option--active" : "segmented__option"
						}
						onClick={() => setDataMode("published")}
					>
						Published
					</button>
				</div>
				{crossFilters.length > 0 && (
					<div className="filter-shelf">
						<Icon name="filter" size={13} />
						<span className="filter-shelf__label">Filters:</span>
						{crossFilters.map((f) => (
							<button
								key={`${f.dimension}:${f.value}`}
								type="button"
								className="filter-shelf__chip"
								onClick={() => clearCrossFilterDimension(f.dimension)}
							>
								{f.dimension}: {f.value}
								<Icon name="close" size={11} />
							</button>
						))}
						{crossFilters.length > 1 && (
							<button type="button" className="link-btn filter-shelf__clear-all" onClick={clearCrossFilters}>
								Clear all
							</button>
						)}
					</div>
				)}
				{selectedIds.size > 1 && <span className="portal-canvas__multi-hint">{selectedIds.size} widgets selected · Delete to remove</span>}
			</div>

			<div
				className={deviceWidth ? "portal-canvas__device-frame" : undefined}
				style={deviceWidth ? { width: deviceWidth } : undefined}
			>
			<div
				className={isDragOver ? "portal-canvas__drop-zone portal-canvas__drop-zone--active" : "portal-canvas__drop-zone"}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{widgets.length === 0 ? (
					<div className="portal-canvas__empty">
						<div className="portal-canvas__empty-icon" aria-hidden="true">
							⊞
						</div>
						<p>This page is empty.</p>
						<p className="portal-canvas__empty-sub">
							Drag a widget from the Stencil panel on the left, or click one to add it.
						</p>
					</div>
				) : (
					<div className="portal-canvas__zoom-wrap" style={{ transform: `scale(${zoom})` }}>
						<div className="portal-canvas__grid" ref={gridRef}>
							{ghostCell && (
								<div
									className="canvas-cell__ghost"
									style={{
										gridColumn: `${ghostCell.x + 1} / span ${ghostCell.w}`,
										gridRow: `${ghostCell.y + 1} / span ${ghostCell.h}`,
									}}
								/>
							)}
							{alignGuides?.vertical.map((col) => (
								<div
									key={`v-${col}`}
									className="align-guide align-guide--vertical"
									style={{ gridColumn: `${col + 1} / span 1`, gridRow: "1 / -1", justifySelf: "start" }}
								/>
							))}
							{alignGuides?.horizontal.map((row) => (
								<div
									key={`h-${row}`}
									className="align-guide align-guide--horizontal"
									style={{ gridRow: `${row + 1} / span 1`, gridColumn: "1 / -1", alignSelf: "start" }}
								/>
							))}
							{widgets.map((widget) => (
								<div
									key={widget.id}
									className={
										selectedIds.has(widget.id) ? "canvas-cell canvas-cell--selected canvas-cell--enter" : "canvas-cell canvas-cell--enter"
									}
									style={{
										gridColumn: `${widget.grid.x + 1} / span ${widget.grid.w}`,
										gridRow: `${widget.grid.y + 1} / span ${widget.grid.h}`,
									}}
									draggable={!readOnly}
									onDragStart={
										readOnly
											? undefined
											: (e) => {
													e.dataTransfer.setData(CANVAS_WIDGET_DND_TYPE, widget.id);
													e.dataTransfer.effectAllowed = "move";
													setDraggingId(widget.id);
												}
									}
									onDragEnd={readOnly ? undefined : handleDragEnd}
									onClick={(e) => {
										e.stopPropagation();
										onSelect(widget.id, e.shiftKey || e.metaKey || e.ctrlKey);
									}}
									onContextMenu={
										readOnly
											? undefined
											: (e) => {
													e.preventDefault();
													e.stopPropagation();
													onSelect(widget.id, false);
													setContextMenu({ widgetId: widget.id, x: e.clientX, y: e.clientY });
												}
									}
								>
									{!readOnly && (
										<div className="canvas-cell__actions">
											<button
												type="button"
												className="canvas-cell__action"
												aria-label="Duplicate widget"
												title="Duplicate"
												onClick={(e) => {
													e.stopPropagation();
													onDuplicate(widget.id);
												}}
											>
												⧉
											</button>
											<button
												type="button"
												className="canvas-cell__action canvas-cell__action--danger"
												aria-label="Delete widget"
												title="Delete"
												onClick={(e) => {
													e.stopPropagation();
													onDelete(widget.id);
												}}
											>
												✕
											</button>
										</div>
									)}
									<WidgetRenderer config={widget} onOpenDrillThrough={onOpenDrillThrough} />
									{!readOnly && (
										<div
											className="canvas-cell__resize-handle"
											onPointerDown={(e) => handleResizeStart(e, widget)}
											aria-hidden="true"
										/>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
			</div>

			{contextMenu && (
				<div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						onClick={() => {
							onDuplicate(contextMenu.widgetId);
							setContextMenu(null);
						}}
					>
						Duplicate
					</button>
					<button
						type="button"
						className="context-menu__danger"
						onClick={() => {
							onDelete(contextMenu.widgetId);
							setContextMenu(null);
						}}
					>
						Delete
					</button>
				</div>
			)}
		</div>
	);
}
