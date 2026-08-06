import { useMemo } from "react";
import type { EntityType, DimensionKey } from "../types/analytics";
import { useGlobalFilters } from "../context/FilterContext";
import { salesRows } from "../mocks/salesData";
import { MEASURES, DIMENSIONS, applyGlobalFilters, aggregateBy, aggregateByDateGrain, formatMeasureValue } from "../utils/analytics";
import { Icon } from "../components/icons/Icon";
import { downloadCsv } from "../utils/exportCsv";

/** entityType -> (the fact-table column it filters on, a sensible "related" dimension to break it down by). */
const ENTITY_CONFIG: Record<EntityType, { column: DimensionKey; relatedBy: DimensionKey }> = {
	seller: { column: "seller", relatedBy: "product" },
	warehouse: { column: "warehouse", relatedBy: "category" },
	product: { column: "product", relatedBy: "region" },
	customer: { column: "customer", relatedBy: "product" },
	region: { column: "region", relatedBy: "category" },
};

const STAT_MEASURES = ["revenue", "profit", "orders", "quantity"] as const;

/**
 * "Open a detailed analysis page for a selected data point" — Drill Through
 * Pages. Given an entity (a seller, warehouse, product, customer, or
 * region), shows a focused mini-dashboard: headline stats, a trend, and one
 * relevant breakdown table — instead of forcing the user to rebuild that
 * view by hand every time from filters.
 */
export function DrillThroughPage({
	entityType,
	entityId,
	onBack,
}: {
	entityType: EntityType;
	entityId: string;
	onBack: () => void;
}) {
	const { filters } = useGlobalFilters();
	const { column, relatedBy } = ENTITY_CONFIG[entityType];

	const rows = useMemo(() => {
		const globallyFiltered = applyGlobalFilters(salesRows, filters);
		return globallyFiltered.filter((r) => r[column] === entityId);
	}, [filters, column, entityId]);

	const trend = useMemo(() => aggregateByDateGrain(rows, "month", "revenue").slice(-12), [rows]);
	const related = useMemo(() => aggregateBy(rows, relatedBy, "revenue").slice(0, 8), [rows, relatedBy]);
	const maxTrend = Math.max(1, ...trend.map((p) => p.value));
	const maxRelated = Math.max(1, ...related.map((p) => p.value));

	const handleExport = () => {
		downloadCsv(`${entityType}-${entityId}`, [
			[DIMENSIONS[relatedBy].label, "Revenue"],
			...related.map((p) => [p.label, String(p.value)]),
		]);
	};

	return (
		<div className="drillthrough-page">
			<div className="drillthrough-page__header">
				<button type="button" className="link-btn" onClick={onBack}>
					<Icon name="collapse" size={13} /> Back to dashboard
				</button>
				<div className="drillthrough-page__title">
					<span className="drillthrough-page__eyebrow">{DIMENSIONS[column].label}</span>
					<h2>{entityId}</h2>
				</div>
			</div>

			<div className="drillthrough-page__stats">
				{STAT_MEASURES.map((key) => {
					const def = MEASURES[key];
					return (
						<div key={key} className="drillthrough-page__stat">
							<span className="drillthrough-page__stat-label">{def.label}</span>
							<span className="drillthrough-page__stat-value">{formatMeasureValue(def.agg(rows), def.format)}</span>
						</div>
					);
				})}
			</div>

			<div className="drillthrough-page__body">
				<div className="drillthrough-page__panel">
					<div className="drillthrough-page__panel-header">Revenue trend</div>
					{trend.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
					{trend.length > 0 && (
						<div className="chart-widget__chart">
							{trend.map((p) => (
								<div key={p.label} className="chart-widget__bar-row" style={{ cursor: "default" }}>
									<span className="chart-widget__bar-label">{p.label}</span>
									<span className="chart-widget__bar-track">
										<span className="chart-widget__bar-fill" style={{ width: `${(p.value / maxTrend) * 100}%` }} />
									</span>
									<span className="chart-widget__bar-value">{formatMeasureValue(p.value, "currency")}</span>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="drillthrough-page__panel">
					<div className="drillthrough-page__panel-header">
						By {DIMENSIONS[relatedBy].label}
						<button type="button" className="widget-card__export" title="Download as CSV" onClick={handleExport}>
							<Icon name="download" size={13} />
						</button>
					</div>
					{related.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
					{related.length > 0 && (
						<div className="chart-widget__chart">
							{related.map((p) => (
								<div key={p.label} className="chart-widget__bar-row" style={{ cursor: "default" }}>
									<span className="chart-widget__bar-label">{p.label}</span>
									<span className="chart-widget__bar-track">
										<span className="chart-widget__bar-fill" style={{ width: `${(p.value / maxRelated) * 100}%` }} />
									</span>
									<span className="chart-widget__bar-value">{formatMeasureValue(p.value, "currency")}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
