import { useMemo, useState } from "react";
import type { TableWidgetConfig } from "../../../types/widget";
import type { DimensionKey, EntityType } from "../../../types/analytics";
import { usePortalContext } from "../../../context/PortalContext";
import { useGlobalFilters } from "../../../context/FilterContext";
import { WidgetCard } from "../shared/WidgetCard";
import { salesRows } from "../../../mocks/salesData";
import { MEASURES, DIMENSIONS, applyGlobalFilters, applyCrossFilters, aggregateTable, formatMeasureValue } from "../../../utils/analytics";
import { downloadCsv } from "../../../utils/exportCsv";
import { Icon } from "../../icons/Icon";

/** Which dimensions have a real drill-through detail page — the rest (business unit, category, subcategory, brand) are aggregates that don't map to one entity, so they stay filter-only. */
const DRILL_THROUGH_DIMS: Partial<Record<DimensionKey, EntityType>> = {
	seller: "seller",
	warehouse: "warehouse",
	product: "product",
	customer: "customer",
	region: "region",
};

const TOP_N_OPTIONS = [5, 10, 12, 20, 999];
const DEFAULT_TOP_N = 12;

/**
 * Ranked table over the sales fact table. Same three interactions as
 * ChartWidget, table-shaped: row click cross-filters every other widget,
 * and (for dimensions that resolve to one real-world entity) a "View
 * details" action opens a dedicated drill-through page for that row.
 */
export function TableWidget({
	config,
	onOpenDrillThrough,
}: {
	config: TableWidgetConfig;
	onOpenDrillThrough?: (entityType: EntityType, entityId: string) => void;
}) {
	const [dimension, setDimension] = useState<DimensionKey>(config.dimension);
	const [topN, setTopN] = useState<number>(config.topN ?? DEFAULT_TOP_N);
	const { filters } = useGlobalFilters();
	const { crossFilters, toggleCrossFilter } = usePortalContext();

	const rows = useMemo(() => {
		let r = applyGlobalFilters(salesRows, filters);
		r = applyCrossFilters(
			r,
			crossFilters.filter((f) => f.dimension !== dimension)
		);
		return r;
	}, [filters, crossFilters, dimension]);

	const tableRows = useMemo(() => aggregateTable(rows, dimension, config.measures).slice(0, topN), [rows, dimension, config.measures, topN]);

	const entityType = DRILL_THROUGH_DIMS[dimension];

	const handleExport = () => {
		downloadCsv(config.title, [
			[DIMENSIONS[dimension].label, ...config.measures.map((m) => MEASURES[m].label)],
			...tableRows.map((r) => [r.label, ...config.measures.map((m) => String(r.values[m] ?? 0))]),
		]);
	};

	return (
		<WidgetCard
			title={config.title}
			onExport={tableRows.length > 0 ? handleExport : undefined}
			tooltip={[
				{ label: "Grouped by", value: DIMENSIONS[dimension].label },
				{ label: "Measures", value: config.measures.map((m) => MEASURES[m].label).join(", ") },
				{ label: "Rows", value: String(rows.length) },
			]}
			toolbar={
				<div className="chart-widget__toolbar">
					<span className="chart-widget__toolbar-by">Group by</span>
					<select className="select-sm" value={dimension} onChange={(e) => setDimension(e.target.value as DimensionKey)}>
						{(Object.keys(DIMENSIONS) as DimensionKey[]).map((d) => (
							<option key={d} value={d}>
								{DIMENSIONS[d].label}
							</option>
						))}
					</select>
					<span className="chart-widget__toolbar-by">Top</span>
					<select className="select-sm" value={topN} onChange={(e) => setTopN(Number(e.target.value))} title="Visual-level Top N filter">
						{TOP_N_OPTIONS.map((n) => (
							<option key={n} value={n}>
								{n === 999 ? "All" : n}
							</option>
						))}
					</select>
				</div>
			}
		>
			{tableRows.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
			{tableRows.length > 0 && (
				<table className="table-widget__table">
					<thead>
						<tr>
							<th>{DIMENSIONS[dimension].label}</th>
							{config.measures.map((m) => (
								<th key={m}>{MEASURES[m].label}</th>
							))}
							{entityType && <th className="table-widget__actions-col" />}
						</tr>
					</thead>
					<tbody>
						{tableRows.map((row) => {
							const isActive = crossFilters.some((f) => f.dimension === dimension && f.value === row.label);
							return (
								<tr
									key={row.label}
									className={isActive ? "table-widget__row table-widget__row--active" : "table-widget__row"}
									onClick={() => toggleCrossFilter({ dimension, value: row.label })}
									title={`Filter dashboard by ${row.label}`}
								>
									<td>{row.label}</td>
									{config.measures.map((m) => (
										<td key={m}>{formatMeasureValue(row.values[m] ?? 0, MEASURES[m].format)}</td>
									))}
									{entityType && (
										<td className="table-widget__actions-col">
											<button
												type="button"
												className="table-widget__drill-btn"
												aria-label={`View details for ${row.label}`}
												title="View details"
												onClick={(e) => {
													e.stopPropagation();
													onOpenDrillThrough?.(entityType, row.label);
												}}
											>
												<Icon name="expand" size={12} />
											</button>
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</WidgetCard>
	);
}
