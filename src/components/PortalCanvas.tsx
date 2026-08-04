import { useCallback, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { GridPosition, WidgetConfig } from "../types/widget";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { usePortalContext } from "../context/PortalContext";

const STENCIL_DND_TYPE = "application/x-stencil-item";
const CANVAS_WIDGET_DND_TYPE = "application/x-canvas-widget";

const GRID_COLUMNS = 8;
const ROW_HEIGHT_PX = 130;
const GRID_GAP_PX = 16; // matches --space-xl

/**
 * Renders the grid of widgets for a Portal page. Layout positioning
 * (config.grid) is deliberately kept simple here (CSS grid via inline
 * column/row) rather than wiring in a drag-and-drop library — the real
 * Portal had two different grid libraries (svelte-grid, gridstack) plus a
 * third unused dependency; picking exactly one, later, is a separate
 * decision from the data-layer redesign this prototype focuses on.
 *
 * Two distinct drag flows share this one drop zone, disambiguated by
 * DataTransfer type: adding a NEW widget from the stencil (copy) vs MOVING
 * an existing widget already on the canvas (repositions its grid.x/y based
 * on drop pixel position, clamped to stay in bounds). Resizing (bottom-right
 * handle) is a separate pointer-drag interaction, not HTML5 DnD — DnD isn't
 * well-suited to a sub-element drag gesture like a resize handle.
 */
export function PortalCanvas({
	widgets,
	selectedId,
	onSelect,
	onDelete,
	onDropWidgetKey,
	onMoveWidget,
	onResizeWidget,
}: {
	widgets: WidgetConfig[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onDropWidgetKey: (key: string) => void;
	onMoveWidget: (id: string, position: Pick<GridPosition, "x" | "y">) => void;
	onResizeWidget: (id: string, size: Pick<GridPosition, "w" | "h">) => void;
}) {
	const { dataMode, setDataMode } = usePortalContext();
	const [isDragOver, setIsDragOver] = useState(false);
	const gridRef = useRef<HTMLDivElement>(null);

	const getColWidth = () => {
		const gridEl = gridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		return (rect.width - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
	};

	const isRelevantDrag = (e: DragEvent<HTMLDivElement>) =>
		e.dataTransfer.types.includes(STENCIL_DND_TYPE) || e.dataTransfer.types.includes(CANVAS_WIDGET_DND_TYPE);

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		if (!isRelevantDrag(e)) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = e.dataTransfer.types.includes(CANVAS_WIDGET_DND_TYPE) ? "move" : "copy";
		setIsDragOver(true);
	};

	const handleDragLeave = () => setIsDragOver(false);

	function computeDropCell(e: DragEvent<HTMLDivElement>, movingWidgetWidth: number): { x: number; y: number } | null {
		const gridEl = gridRef.current;
		const colWidth = getColWidth();
		if (!gridEl || colWidth === null) return null;
		const rect = gridEl.getBoundingClientRect();

		const relX = e.clientX - rect.left;
		const relY = e.clientY - rect.top;

		const col = Math.floor(relX / (colWidth + GRID_GAP_PX));
		const row = Math.floor(relY / (ROW_HEIGHT_PX + GRID_GAP_PX));

		return {
			x: Math.max(0, Math.min(col, GRID_COLUMNS - movingWidgetWidth)),
			y: Math.max(0, row),
		};
	}

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);

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

			const startX = e.clientX;
			const startY = e.clientY;
			const startW = widget.grid.w;
			const startH = widget.grid.h;

			const handlePointerMove = (moveEvent: PointerEvent) => {
				const deltaCols = Math.round((moveEvent.clientX - startX) / (colWidth + GRID_GAP_PX));
				const deltaRows = Math.round((moveEvent.clientY - startY) / (ROW_HEIGHT_PX + GRID_GAP_PX));
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
		[onResizeWidget]
	);

	return (
		<div className="portal-canvas">
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
			</div>

			<div
				className={isDragOver ? "portal-canvas__drop-zone portal-canvas__drop-zone--active" : "portal-canvas__drop-zone"}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{widgets.length === 0 ? (
					<div className="portal-canvas__empty">
						<p>This page is empty.</p>
						<p className="portal-canvas__empty-sub">
							Drag a widget from the Stencil panel on the left, or click one to add it.
						</p>
					</div>
				) : (
					<div className="portal-canvas__grid" ref={gridRef}>
						{widgets.map((widget) => (
							<div
								key={widget.id}
								className={widget.id === selectedId ? "canvas-cell canvas-cell--selected" : "canvas-cell"}
								style={{
									gridColumn: `${widget.grid.x + 1} / span ${widget.grid.w}`,
									gridRow: `${widget.grid.y + 1} / span ${widget.grid.h}`,
								}}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData(CANVAS_WIDGET_DND_TYPE, widget.id);
									e.dataTransfer.effectAllowed = "move";
								}}
								onClick={() => onSelect(widget.id)}
							>
								<button
									type="button"
									className="canvas-cell__delete"
									aria-label="Delete widget"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(widget.id);
									}}
								>
									✕
								</button>
								<WidgetRenderer config={widget} />
								<div
									className="canvas-cell__resize-handle"
									onPointerDown={(e) => handleResizeStart(e, widget)}
									aria-hidden="true"
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
