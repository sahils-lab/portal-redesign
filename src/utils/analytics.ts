import type { SalesRow, MeasureKey, MeasureDef, DimensionKey, DimensionDef, GlobalFilters, DateGrain } from "../types/analytics";

/**
 * The query engine every data-driven widget (KPI, Chart, Table) and every
 * interactive feature (global filters, cross-filtering, drill-down,
 * drill-through, dynamic field switching) runs through. One place that
 * knows how to filter/group/aggregate the fact table, instead of each
 * widget writing its own reduce().
 */

export const MEASURES: Record<MeasureKey, MeasureDef> = {
	revenue: { key: "revenue", label: "Revenue", format: "currency", agg: (rows) => sum(rows, (r) => r.revenue) },
	profit: { key: "profit", label: "Profit", format: "currency", agg: (rows) => sum(rows, (r) => r.profit) },
	quantity: { key: "quantity", label: "Quantity", format: "number", agg: (rows) => sum(rows, (r) => r.quantity) },
	orders: { key: "orders", label: "Orders", format: "number", agg: (rows) => rows.length },
	returns: { key: "returns", label: "Returns", format: "number", agg: (rows) => rows.filter((r) => r.returned).length },
	customers: {
		key: "customers",
		label: "Customers",
		format: "number",
		agg: (rows) => new Set(rows.map((r) => r.customer)).size,
	},
};

export const DIMENSIONS: Record<DimensionKey, DimensionDef> = {
	region: { key: "region", label: "Region" },
	businessUnit: { key: "businessUnit", label: "Business Unit" },
	warehouse: { key: "warehouse", label: "Warehouse" },
	category: { key: "category", label: "Category" },
	subcategory: { key: "subcategory", label: "Subcategory" },
	product: { key: "product", label: "Product" },
	brand: { key: "brand", label: "Brand" },
	seller: { key: "seller", label: "Seller" },
	customer: { key: "customer", label: "Customer" },
};

function sum(rows: SalesRow[], pick: (r: SalesRow) => number): number {
	let total = 0;
	for (const r of rows) total += pick(r);
	return Math.round(total * 100) / 100;
}

/** Global sync filters — persistent, applies across every page. */
export function applyGlobalFilters(rows: SalesRow[], filters: GlobalFilters): SalesRow[] {
	return rows.filter((r) => {
		if (filters.dateFrom && r.date < filters.dateFrom) return false;
		if (filters.dateTo && r.date > filters.dateTo) return false;
		if (filters.region.length && !filters.region.includes(r.region)) return false;
		if (filters.businessUnit.length && !filters.businessUnit.includes(r.businessUnit)) return false;
		if (filters.warehouse.length && !filters.warehouse.includes(r.warehouse)) return false;
		if (filters.category.length && !filters.category.includes(r.category)) return false;
		if (filters.brand.length && !filters.brand.includes(r.brand)) return false;
		if (filters.seller.length && !filters.seller.includes(r.seller)) return false;
		return true;
	});
}

/** Transient, click-driven cross-visual filter — a set of active {dimension, value} pairs, ANDed together. */
export interface CrossFilterEntry {
	dimension: string;
	value: string;
}

export function applyCrossFilters(rows: SalesRow[], active: CrossFilterEntry[]): SalesRow[] {
	if (active.length === 0) return rows;
	return rows.filter((r) =>
		active.every((f) => {
			const v = (r as unknown as Record<string, unknown>)[f.dimension];
			return v === undefined || String(v) === f.value;
		})
	);
}

export interface AggregatedPoint {
	label: string;
	value: number;
}

export function aggregateBy(rows: SalesRow[], dimension: DimensionKey, measure: MeasureKey): AggregatedPoint[] {
	const groups = new Map<string, SalesRow[]>();
	for (const r of rows) {
		const key = r[dimension];
		const bucket = groups.get(key);
		if (bucket) bucket.push(r);
		else groups.set(key, [r]);
	}
	const agg = MEASURES[measure].agg;
	return Array.from(groups.entries())
		.map(([label, groupRows]) => ({ label, value: agg(groupRows) }))
		.sort((a, b) => b.value - a.value);
}

export function topN(rows: SalesRow[], dimension: DimensionKey, measure: MeasureKey, n: number): AggregatedPoint[] {
	return aggregateBy(rows, dimension, measure).slice(0, n);
}

export interface TableRow {
	label: string;
	values: Partial<Record<MeasureKey, number>>;
}

/** Same grouping as `aggregateBy`, but rolls up several measures per group in one pass — what TableWidget needs (one row per dimension value, one column per selected measure). */
export function aggregateTable(rows: SalesRow[], dimension: DimensionKey, measures: MeasureKey[]): TableRow[] {
	const groups = new Map<string, SalesRow[]>();
	for (const r of rows) {
		const key = r[dimension];
		const bucket = groups.get(key);
		if (bucket) bucket.push(r);
		else groups.set(key, [r]);
	}
	const primary = MEASURES[measures[0]];
	return Array.from(groups.entries())
		.map(([label, groupRows]) => ({
			label,
			values: Object.fromEntries(measures.map((m) => [m, MEASURES[m].agg(groupRows)])),
		}))
		.sort((a, b) => (b.values[primary.key] ?? 0) - (a.values[primary.key] ?? 0));
}

export interface MatrixResult {
	rowLabels: string[];
	colLabels: string[];
	cells: Record<string, Record<string, number>>;
	rowTotals: Record<string, number>;
	colTotals: Record<string, number>;
	grandTotal: number;
}

/**
 * Cross-tab pivot for MatrixWidget: rows x columns, one measure per cell,
 * plus row/column subtotals and a grand total. Rows and columns are each
 * capped to their top-N by total (`rowLimit`/`colLimit`) so the table stays
 * readable — this is a flat pivot, not a hierarchical/expandable matrix.
 */
export function aggregateMatrix(
	rows: SalesRow[],
	rowDimension: DimensionKey,
	colDimension: DimensionKey,
	measure: MeasureKey,
	rowLimit = 8,
	colLimit = 6
): MatrixResult {
	const agg = MEASURES[measure].agg;
	const rowLabels = aggregateBy(rows, rowDimension, measure)
		.slice(0, rowLimit)
		.map((p) => p.label);
	const colLabels = aggregateBy(rows, colDimension, measure)
		.slice(0, colLimit)
		.map((p) => p.label);
	const rowLabelSet = new Set(rowLabels);
	const colLabelSet = new Set(colLabels);

	const cells: Record<string, Record<string, number>> = {};
	const rowTotals: Record<string, number> = {};
	const colTotals: Record<string, number> = {};
	let grandTotal = 0;

	for (const rowLabel of rowLabels) {
		cells[rowLabel] = {};
		const rowRows = rows.filter((r) => r[rowDimension] === rowLabel);
		for (const colLabel of colLabels) {
			const cellRows = rowRows.filter((r) => r[colDimension] === colLabel);
			cells[rowLabel][colLabel] = agg(cellRows);
		}
		rowTotals[rowLabel] = agg(rowRows.filter((r) => colLabelSet.has(r[colDimension])));
	}
	for (const colLabel of colLabels) {
		const colRows = rows.filter((r) => r[colDimension] === colLabel && rowLabelSet.has(r[rowDimension]));
		colTotals[colLabel] = agg(colRows);
	}
	grandTotal = agg(rows.filter((r) => rowLabelSet.has(r[rowDimension]) && colLabelSet.has(r[colDimension])));

	return { rowLabels, colLabels, cells, rowTotals, colTotals, grandTotal };
}

// ---------- Date grain bucketing (Year -> Quarter -> Month -> Week -> Day) ----------

function isoWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function dateGrainKey(dateIso: string, grain: DateGrain): string {
	const d = new Date(`${dateIso}T00:00:00Z`);
	const year = d.getUTCFullYear();
	switch (grain) {
		case "year":
			return `${year}`;
		case "quarter":
			return `${year}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
		case "month":
			return `${year}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
		case "week":
			return `${year}-W${String(isoWeek(d)).padStart(2, "0")}`;
		case "day":
			return dateIso;
	}
}

export function dateGrainLabel(key: string, grain: DateGrain): string {
	if (grain === "month") {
		const [y, m] = key.split("-");
		const name = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("en-US", {
			month: "short",
			timeZone: "UTC",
		});
		return `${name} ${y}`;
	}
	return key;
}

export interface DateAggregatedPoint extends AggregatedPoint {
	/** Raw grain-bucket key (e.g. "2024-Q3"), for filtering when drilling into this bucket — `label` is display-formatted and not safe to filter on. */
	key: string;
}

export function aggregateByDateGrain(rows: SalesRow[], grain: DateGrain, measure: MeasureKey): DateAggregatedPoint[] {
	const groups = new Map<string, SalesRow[]>();
	for (const r of rows) {
		const key = dateGrainKey(r.date, grain);
		const bucket = groups.get(key);
		if (bucket) bucket.push(r);
		else groups.set(key, [r]);
	}
	const agg = MEASURES[measure].agg;
	return Array.from(groups.entries())
		.map(([key, groupRows]) => ({ label: dateGrainLabel(key, grain), value: agg(groupRows), key }))
		.sort((a, b) => (a.key < b.key ? -1 : 1));
}

/** The next finer grain when drilling down the date hierarchy. */
export const DATE_GRAIN_ORDER: DateGrain[] = ["year", "quarter", "month", "week", "day"];

export function formatMeasureValue(value: number, format: "currency" | "number"): string {
	if (format === "currency") {
		if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
		return `$${value.toFixed(0)}`;
	}
	if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return `${Math.round(value)}`;
}
