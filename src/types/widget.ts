/**
 * Shared widget types. One source of truth for the shape of every widget type —
 * the original Portal had this duplicated/drifted across 4+ files (KPI/Metric
 * container + modal). Everything here is a discriminated union on `type`, so
 * adding a new widget type forces you to handle it everywhere via exhaustive
 * switch checks instead of silently falling through.
 */

import type { MeasureKey, DimensionKey, DateGrain } from "./analytics";

export type WidgetType =
	| "kpi"
	| "metric"
	| "report"
	| "recon"
	| "chart"
	| "table"
	| "title"
	| "label"
	| "divider"
	| "info"
	| "alert";

/**
 * Widget types that actually fetch data through useWidgetData/widgetFetchers.
 * Display-category widgets (title/label/divider/info/alert) render straight
 * from their own config — no async fetch, no live/published distinction.
 * Analytics widgets (chart/table) are a third category: they read
 * synchronously from the in-memory sales fact table (see `mocks/salesData`)
 * through the global + cross filters, so they don't need a loading state or
 * a live/published split either — they're not part of `DataWidgetType`.
 */
export type DataWidgetType = "kpi" | "metric" | "report" | "recon";

/** Whether a widget shows the live (editable draft) data or the last-published snapshot. */
export type DataMode = "live" | "published";

export interface GridPosition {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface BaseWidgetConfig {
	id: string;
	title: string;
	grid: GridPosition;
}

export interface KPIWidgetConfig extends BaseWidgetConfig {
	type: "kpi";
	metricId: string;
	valueFormat: "number" | "currency" | "percent";
}

export interface MetricWidgetConfig extends BaseWidgetConfig {
	type: "metric";
	metricId: string;
	rowGroups: string[];
	valueCols: string[];
}

export interface ReportWidgetConfig extends BaseWidgetConfig {
	type: "report";
	statementId: string;
}

export interface ReconWidgetConfig extends BaseWidgetConfig {
	type: "recon";
	reconId: string;
}

/** Bar/line chart over the sales fact table — the dimension and measure are user-switchable (Dynamic Field Switching), and the dimension supports drill-down/up (date hierarchy or category hierarchy). */
export interface ChartWidgetConfig extends BaseWidgetConfig {
	type: "chart";
	chartType: "bar" | "line";
	measure: MeasureKey;
	/** "date" drills Year -> Quarter -> Month -> Week -> Day; any DimensionKey drills through its catalog hierarchy where one exists (category -> subcategory -> product). */
	dimension: DimensionKey | "date";
	dateGrain: DateGrain;
}

/** Ranked table over the sales fact table — rows are click-to-cross-filter and each has a "View details" drill-through action. */
export interface TableWidgetConfig extends BaseWidgetConfig {
	type: "table";
	dimension: DimensionKey;
	measures: MeasureKey[];
}

/** Display-category widgets — no data fetch, pure config -> render. */

export interface TitleWidgetConfig extends BaseWidgetConfig {
	type: "title";
	text: string;
	level: "h1" | "h2" | "h3";
}

export interface LabelWidgetConfig extends BaseWidgetConfig {
	type: "label";
	text: string;
}

export interface DividerWidgetConfig extends BaseWidgetConfig {
	type: "divider";
}

export type InfoSeverity = "info" | "success" | "warning";

export interface InfoWidgetConfig extends BaseWidgetConfig {
	type: "info";
	message: string;
	severity: InfoSeverity;
}

export type AlertSeverity = "info" | "success" | "warning" | "danger";

export interface AlertWidgetConfig extends BaseWidgetConfig {
	type: "alert";
	message: string;
	severity: AlertSeverity;
}

export type WidgetConfig =
	| KPIWidgetConfig
	| MetricWidgetConfig
	| ReportWidgetConfig
	| ReconWidgetConfig
	| ChartWidgetConfig
	| TableWidgetConfig
	| TitleWidgetConfig
	| LabelWidgetConfig
	| DividerWidgetConfig
	| InfoWidgetConfig
	| AlertWidgetConfig;

/** Generic result envelope every widget's data fetch resolves to — same shape regardless of widget type. */
export interface WidgetDataResult<T> {
	status: "loading" | "success" | "error";
	data: T | null;
	error: string | null;
	/** Which mode this data actually came from — lets the UI show a "viewing published" badge, etc. */
	source: DataMode;
}

export interface KPIData {
	value: number;
	previousValue: number | null;
	currency: string | null;
	/** Per-"region" breakdown, keyed the same way MetricData's row labels are — lets the cross-filter narrow this KPI to a single region, and powers the click-to-drill breakdown. */
	byRegion?: Record<string, number>;
	/** Recent-period values (oldest -> newest) for the sparkline. */
	trend?: number[];
	/** Optional goal for this KPI — drives the conditional-formatting status color (on-track / at-risk / behind). */
	target?: number | null;
}

export interface MetricRow {
	label: string;
	values: Record<string, number>;
}

export interface MetricData {
	rows: MetricRow[];
	columns: string[];
}

export interface ReportData {
	sections: { title: string; rows: { label: string; value: string }[] }[];
}

export interface ReconData {
	matched: number;
	unmatched: number;
	total: number;
}
