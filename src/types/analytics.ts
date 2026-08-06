/**
 * Types for the analytics layer (mock sales fact table + the query engine
 * that powers charts, global filters, drill-down, drill-through, key
 * influencers, and NL query). Kept separate from `widget.ts` (the dashboard
 * widget-config model) — this is the *data* side, widgets are the
 * *presentation* side, and several widget types (KPI, Chart, Table) all
 * query the same fact table through the same functions.
 */

/** One order line — the atomic unit of the mock fact table. */
export interface SalesRow {
	id: string;
	date: string; // ISO yyyy-mm-dd
	region: string;
	businessUnit: string;
	warehouse: string;
	category: string;
	subcategory: string;
	product: string;
	brand: string;
	seller: string;
	customer: string;
	revenue: number;
	profit: number;
	quantity: number;
	returned: boolean;
}

export type MeasureKey = "revenue" | "profit" | "quantity" | "orders" | "returns" | "customers";

export interface MeasureDef {
	key: MeasureKey;
	label: string;
	format: "currency" | "number";
	/** How to roll this measure up from a set of rows. */
	agg: (rows: SalesRow[]) => number;
}

/** Non-date dimensions available for grouping/filtering. */
export type DimensionKey =
	| "region"
	| "businessUnit"
	| "warehouse"
	| "category"
	| "subcategory"
	| "product"
	| "brand"
	| "seller"
	| "customer";

export interface DimensionDef {
	key: DimensionKey;
	label: string;
}

/** A hierarchy drill-down path, e.g. Category -> Subcategory -> Product. */
export type DrillHierarchy = { key: string; levels: DimensionKey[] } | { key: "date"; levels: DateGrain[] };

export type DateGrain = "year" | "quarter" | "month" | "week" | "day";

/** Entity types a drill-through page can be opened for. */
export type EntityType = "seller" | "warehouse" | "product" | "customer" | "region";

/** Global sync filters — persistent, user-set, shared across every dashboard page (not the same as the transient click-driven cross-filter). */
export interface GlobalFilters {
	dateFrom: string | null;
	dateTo: string | null;
	region: string[];
	businessUnit: string[];
	warehouse: string[];
	category: string[];
	brand: string[];
	seller: string[];
}

export const EMPTY_GLOBAL_FILTERS: GlobalFilters = {
	dateFrom: null,
	dateTo: null,
	region: [],
	businessUnit: [],
	warehouse: [],
	category: [],
	brand: [],
	seller: [],
};
