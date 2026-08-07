import type {
	WidgetConfig,
	WidgetType,
	GridPosition,
	KPIWidgetConfig,
	MetricWidgetConfig,
	ReportWidgetConfig,
	ReconWidgetConfig,
	ChartWidgetConfig,
	TableWidgetConfig,
	WaterfallWidgetConfig,
	MatrixWidgetConfig,
	WhatIfWidgetConfig,
	TitleWidgetConfig,
	LabelWidgetConfig,
	DividerWidgetConfig,
	InfoWidgetConfig,
	AlertWidgetConfig,
} from "../../types/widget";
import type { StencilItem } from "./stencilConfig";

let nextId = 100;

/**
 * Each widget type's default footprint on the 8-column grid — the single
 * source of truth for "how big is a new one of these," used both when
 * actually creating a widget (below) and by PortalCanvas to size the drag
 * ghost/collision check for a stencil item mid-drag, before it's dropped.
 * Kept here (not stencilConfig.ts) since it's about the widget being
 * created, not the palette entry that creates it.
 */
const WIDGET_SIZE: Partial<Record<WidgetType, { w: number; h: number }>> = {
	kpi: { w: 2, h: 2 },
	metric: { w: 4, h: 2 },
	report: { w: 2, h: 2 },
	recon: { w: 2, h: 2 },
	chart: { w: 4, h: 2 },
	table: { w: 4, h: 2 },
	waterfall: { w: 4, h: 2 },
	matrix: { w: 4, h: 2 },
	whatif: { w: 3, h: 1 },
	title: { w: 8, h: 1 },
	label: { w: 3, h: 1 },
	divider: { w: 8, h: 1 },
	info: { w: 4, h: 1 },
	alert: { w: 4, h: 1 },
};

export function defaultWidgetSize(type: WidgetType): { w: number; h: number } {
	return WIDGET_SIZE[type] ?? { w: 2, h: 2 };
}

/** Finds the next free row below all existing widgets so new ones don't overlap — used when there's no explicit drop position (click-to-add from the stencil). */
function nextGridPosition(existing: WidgetConfig[], w: number, h: number): GridPosition {
	const maxY = existing.reduce((max, widget) => Math.max(max, widget.grid.y + widget.grid.h), 0);
	return { x: 0, y: maxY, w, h };
}

type WidgetBase = Pick<WidgetConfig, "id" | "title">;

function makeBase(item: StencilItem): WidgetBase {
	return { id: `w${nextId++}`, title: item.label };
}

/**
 * Creates a new widget config from a clicked/dropped stencil item, using the
 * shared mock entities so newly-added widgets render real (mock) data
 * immediately instead of an empty/unconfigured state.
 *
 * `at`, when given, is an already collision-checked grid cell (PortalCanvas
 * computes and validates it against `defaultWidgetSize` during the drag, so
 * the ghost preview shown while dragging is the actual position the widget
 * lands at — no silent "shifts to wherever there's room" behavior). Omitted
 * for the click-to-add path, which has no cursor position to go on and
 * falls back to appending below everything else.
 */
export function createWidgetFromStencil(
	item: StencilItem,
	existing: WidgetConfig[],
	at?: { x: number; y: number }
): WidgetConfig | null {
	if (!item.widgetType) return null;
	const base = makeBase(item);
	const { w, h } = defaultWidgetSize(item.widgetType);
	const grid: GridPosition = at ? { x: at.x, y: at.y, w, h } : nextGridPosition(existing, w, h);

	switch (item.widgetType) {
		case "kpi":
			return { ...base, grid, type: "kpi", metricId: "metric-revenue", valueFormat: "currency" } satisfies KPIWidgetConfig;
		case "metric":
			return {
				...base,
				grid,
				type: "metric",
				metricId: "metric-revenue",
				rowGroups: ["region"],
				valueCols: ["Q1", "Q2", "Q3"],
			} satisfies MetricWidgetConfig;
		case "report":
			return { ...base, grid, type: "report", statementId: "statement-monthly" } satisfies ReportWidgetConfig;
		case "recon":
			return { ...base, grid, type: "recon", reconId: "recon-bank" } satisfies ReconWidgetConfig;
		case "chart":
			return {
				...base,
				grid,
				type: "chart",
				chartType: "bar",
				measure: "revenue",
				dimension: "region",
				dateGrain: "month",
			} satisfies ChartWidgetConfig;
		case "table":
			return { ...base, grid, type: "table", dimension: "seller", measures: ["revenue", "orders"] } satisfies TableWidgetConfig;
		case "waterfall":
			return {
				...base,
				grid,
				type: "waterfall",
				measure: "revenue",
				dimension: "date",
				dateGrain: "month",
			} satisfies WaterfallWidgetConfig;
		case "matrix":
			return {
				...base,
				grid,
				type: "matrix",
				rowDimension: "region",
				columnDimension: "category",
				measure: "revenue",
			} satisfies MatrixWidgetConfig;
		case "whatif":
			return {
				...base,
				grid,
				type: "whatif",
				parameterId: base.id,
				label: "Revenue growth",
				min: -20,
				max: 20,
				step: 1,
				defaultValue: 0,
				unit: "percent",
			} satisfies WhatIfWidgetConfig;
		case "title":
			return { ...base, grid, type: "title", text: "New section title", level: "h2" } satisfies TitleWidgetConfig;
		case "label":
			return { ...base, grid, type: "label", text: "New label" } satisfies LabelWidgetConfig;
		case "divider":
			return { ...base, grid, type: "divider" } satisfies DividerWidgetConfig;
		case "info":
			return {
				...base,
				grid,
				type: "info",
				message: "This is an informational note.",
				severity: "info",
			} satisfies InfoWidgetConfig;
		case "alert":
			return {
				...base,
				grid,
				type: "alert",
				message: "Heads up — something needs attention.",
				severity: "warning",
			} satisfies AlertWidgetConfig;
	}
}
