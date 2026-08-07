import type {
	WidgetConfig,
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

/** Finds the next free row below all existing widgets so new ones don't overlap. */
function nextGridPosition(existing: WidgetConfig[], w = 2, h = 2): GridPosition {
	const maxY = existing.reduce((max, widget) => Math.max(max, widget.grid.y + widget.grid.h), 0);
	return { x: 0, y: maxY, w, h };
}

type WidgetBase = Pick<WidgetConfig, "id" | "title">;

function makeBase(item: StencilItem): WidgetBase {
	return { id: `w${nextId++}`, title: item.label };
}

/**
 * Creates a new widget config from a clicked stencil item, using the shared
 * mock entities so newly-added widgets render real (mock) data immediately
 * instead of an empty/unconfigured state. Display-category widgets get a
 * shorter default height since they're single-line elements, not cards.
 */
export function createWidgetFromStencil(item: StencilItem, existing: WidgetConfig[]): WidgetConfig | null {
	if (!item.widgetType) return null;
	const base = makeBase(item);

	switch (item.widgetType) {
		case "kpi":
			return {
				...base,
				grid: nextGridPosition(existing),
				type: "kpi",
				metricId: "metric-revenue",
				valueFormat: "currency",
			} satisfies KPIWidgetConfig;
		case "metric":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 2),
				type: "metric",
				metricId: "metric-revenue",
				rowGroups: ["region"],
				valueCols: ["Q1", "Q2", "Q3"],
			} satisfies MetricWidgetConfig;
		case "report":
			return {
				...base,
				grid: nextGridPosition(existing),
				type: "report",
				statementId: "statement-monthly",
			} satisfies ReportWidgetConfig;
		case "recon":
			return {
				...base,
				grid: nextGridPosition(existing),
				type: "recon",
				reconId: "recon-bank",
			} satisfies ReconWidgetConfig;
		case "chart":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 2),
				type: "chart",
				chartType: "bar",
				measure: "revenue",
				dimension: "region",
				dateGrain: "month",
			} satisfies ChartWidgetConfig;
		case "table":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 2),
				type: "table",
				dimension: "seller",
				measures: ["revenue", "orders"],
			} satisfies TableWidgetConfig;
		case "waterfall":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 2),
				type: "waterfall",
				measure: "revenue",
				dimension: "date",
				dateGrain: "month",
			} satisfies WaterfallWidgetConfig;
		case "matrix":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 2),
				type: "matrix",
				rowDimension: "region",
				columnDimension: "category",
				measure: "revenue",
			} satisfies MatrixWidgetConfig;
		case "whatif":
			return {
				...base,
				grid: nextGridPosition(existing, 3, 1),
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
			return {
				...base,
				grid: nextGridPosition(existing, 8, 1),
				type: "title",
				text: "New section title",
				level: "h2",
			} satisfies TitleWidgetConfig;
		case "label":
			return {
				...base,
				grid: nextGridPosition(existing, 3, 1),
				type: "label",
				text: "New label",
			} satisfies LabelWidgetConfig;
		case "divider":
			return {
				...base,
				grid: nextGridPosition(existing, 8, 1),
				type: "divider",
			} satisfies DividerWidgetConfig;
		case "info":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 1),
				type: "info",
				message: "This is an informational note.",
				severity: "info",
			} satisfies InfoWidgetConfig;
		case "alert":
			return {
				...base,
				grid: nextGridPosition(existing, 4, 1),
				type: "alert",
				message: "Heads up — something needs attention.",
				severity: "warning",
			} satisfies AlertWidgetConfig;
	}
}
