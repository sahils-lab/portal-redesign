import { useMemo, useState } from "react";
import type { ChartWidgetConfig } from "../../../types/widget";
import type { MeasureKey, DimensionKey, DateGrain, EntityType } from "../../../types/analytics";
import type { AggregatedPoint, DateAggregatedPoint } from "../../../utils/analytics";
import { usePortalContext } from "../../../context/PortalContext";
import { useGlobalFilters } from "../../../context/FilterContext";
import { WidgetCard } from "../shared/WidgetCard";
import { salesRows } from "../../../mocks/salesData";
import {
	MEASURES,
	DIMENSIONS,
	applyGlobalFilters,
	applyCrossFilters,
	aggregateBy,
	aggregateByDateGrain,
	dateGrainKey,
	DATE_GRAIN_ORDER,
	formatMeasureValue,
} from "../../../utils/analytics";
import { downloadCsv } from "../../../utils/exportCsv";
import { Icon } from "../../icons/Icon";

/** The one dimension with a real drill hierarchy in the catalog (besides date): Category -> Subcategory -> Product. */
const CATALOG_LEVELS: DimensionKey[] = ["category", "subcategory", "product"];

const MEASURE_OPTIONS = Object.values(MEASURES);
const DIMENSION_OPTIONS: (DimensionKey | "date")[] = ["date", ...(Object.keys(DIMENSIONS) as DimensionKey[])];
const TOP_N_OPTIONS = [5, 10, 15, 20, 999];
const DEFAULT_TOP_N = 8;

/**
 * Bar/line chart over the shared sales fact table. Three interactive
 * features converge here because they all touch the same query: swapping
 * the measure/dimension (Dynamic Field Switching), drilling the date or
 * category hierarchy (Drill Down/Up), and clicking a bar to cross-filter
 * every other widget on the page.
 */
export function ChartWidget({
	config,
	onOpenDrillThrough,
}: {
	config: ChartWidgetConfig;
	onOpenDrillThrough?: (entityType: EntityType, entityId: string) => void;
}) {
	const [measure, setMeasure] = useState<MeasureKey>(config.measure);
	const [dimension, setDimension] = useState<DimensionKey | "date">(config.dimension);
	const [chartType, setChartType] = useState<"bar" | "line">(config.chartType);
	const [dateDrill, setDateDrill] = useState<{ grain: DateGrain; key: string; label: string }[]>([]);
	const [catalogDrill, setCatalogDrill] = useState<{ level: DimensionKey; value: string }[]>([]);
	const [topN, setTopN] = useState<number>(config.topN ?? DEFAULT_TOP_N);
	const [whatIfId, setWhatIfId] = useState<string>("");

	const { filters } = useGlobalFilters();
	const { crossFilters, toggleCrossFilter, whatIfParams } = usePortalContext();
	const activeWhatIf = whatIfId ? whatIfParams[whatIfId] : undefined;
	// Percent parameters only — a "number" what-if wouldn't have an obvious
	// unit-consistent way to apply to every measure, so it's exposed for
	// display (WhatIfWidget) but not wired into this multiplier.
	const whatIfFactor = activeWhatIf && activeWhatIf.unit === "percent" ? 1 + activeWhatIf.value / 100 : 1;

	const changeDimension = (next: DimensionKey | "date") => {
		setDimension(next);
		setDateDrill([]);
		setCatalogDrill([]);
	};

	const measureDef = MEASURES[measure];

	const baseRows = useMemo(() => {
		let rows = applyGlobalFilters(salesRows, filters);
		// A chart doesn't filter itself out by its own dimension's selection —
		// otherwise every bar but the clicked one would vanish. Other widgets'
		// cross-filters (a different dimension) still narrow this chart's data.
		const otherCrossFilters = crossFilters.filter((f) => f.dimension !== dimension);
		rows = applyCrossFilters(rows, otherCrossFilters);
		for (const d of dateDrill) rows = rows.filter((r) => dateGrainKey(r.date, d.grain) === d.key);
		for (const c of catalogDrill) rows = rows.filter((r) => (r as unknown as Record<string, string>)[c.level] === c.value);
		return rows;
	}, [filters, crossFilters, dimension, dateDrill, catalogDrill]);

	const currentGrain: DateGrain =
		DATE_GRAIN_ORDER[Math.min(DATE_GRAIN_ORDER.indexOf(config.dateGrain) + dateDrill.length, DATE_GRAIN_ORDER.length - 1)];
	const currentCatalogLevel = CATALOG_LEVELS[catalogDrill.length];

	const series = useMemo(() => {
		let points: (AggregatedPoint | DateAggregatedPoint)[];
		if (dimension === "date") points = aggregateByDateGrain(baseRows, currentGrain, measure).slice(-topN);
		else if (dimension === "category") points = aggregateBy(baseRows, currentCatalogLevel, measure).slice(0, topN);
		else points = aggregateBy(baseRows, dimension, measure).slice(0, topN);
		if (whatIfFactor === 1) return points;
		return points.map((p) => ({ ...p, value: Math.round(p.value * whatIfFactor * 100) / 100 }));
	}, [baseRows, dimension, measure, currentGrain, currentCatalogLevel, topN, whatIfFactor]);

	const canDrillDown =
		dimension === "date"
			? DATE_GRAIN_ORDER.indexOf(config.dateGrain) + dateDrill.length < DATE_GRAIN_ORDER.length - 1
			: dimension === "category" && catalogDrill.length < 2;

	const handlePointClick = (point: { label: string; value: number } & { key?: string }) => {
		if (dimension === "date" && canDrillDown) {
			const key = "key" in point ? (point as { key: string }).key : point.label;
			setDateDrill((d) => [...d, { grain: currentGrain, key, label: point.label }]);
			return;
		}
		if (dimension === "category" && canDrillDown) {
			setCatalogDrill((d) => [...d, { level: currentCatalogLevel, value: point.label }]);
			return;
		}
		if (dimension === "category" && currentCatalogLevel === "product" && onOpenDrillThrough) {
			onOpenDrillThrough("product", point.label);
			return;
		}
		if (dimension !== "date") {
			toggleCrossFilter({ dimension, value: point.label });
		}
	};

	const breadcrumb: { label: string; onClick: () => void }[] = [
		{ label: "All", onClick: () => (dimension === "date" ? setDateDrill([]) : setCatalogDrill([])) },
	];
	if (dimension === "date") {
		dateDrill.forEach((d, i) =>
			breadcrumb.push({ label: d.label, onClick: () => setDateDrill((cur) => cur.slice(0, i + 1)) })
		);
	} else if (dimension === "category") {
		catalogDrill.forEach((d, i) =>
			breadcrumb.push({ label: d.value, onClick: () => setCatalogDrill((cur) => cur.slice(0, i + 1)) })
		);
	}

	const dimensionLabel = dimension === "date" ? "Period" : DIMENSIONS[dimension].label;

	const handleExport = () => {
		downloadCsv(config.title, [[dimensionLabel, measureDef.label], ...series.map((p) => [p.label, String(p.value)])]);
	};

	const maxValue = Math.max(1, ...series.map((p) => p.value));
	const showLine = chartType === "line" && dimension === "date";
	const linePoints = series.map((p, i) => ({
		x: series.length > 1 ? (i / (series.length - 1)) * 300 : 150,
		y: 108 - (p.value / maxValue) * 96,
		point: p,
	}));

	return (
		<WidgetCard
			title={config.title}
			onExport={series.length > 0 ? handleExport : undefined}
			tooltip={[
				{ label: "Measure", value: measureDef.label },
				{ label: "Dimension", value: dimension === "date" ? `Date (${currentGrain})` : DIMENSIONS[dimension].label },
				{ label: "Rows", value: String(baseRows.length) },
				...(activeWhatIf ? [{ label: "What-if applied", value: `${activeWhatIf.label}: ${activeWhatIf.value}%` }] : []),
			]}
			toolbar={
				<div className="chart-widget__toolbar">
					<select className="select-sm" value={measure} onChange={(e) => setMeasure(e.target.value as MeasureKey)}>
						{MEASURE_OPTIONS.map((m) => (
							<option key={m.key} value={m.key}>
								{m.label}
							</option>
						))}
					</select>
					<span className="chart-widget__toolbar-by">by</span>
					<select
						className="select-sm"
						value={dimension}
						onChange={(e) => changeDimension(e.target.value as DimensionKey | "date")}
					>
						{DIMENSION_OPTIONS.map((d) => (
							<option key={d} value={d}>
								{d === "date" ? "Date" : DIMENSIONS[d].label}
							</option>
						))}
					</select>
					{dimension === "date" && (
						<div className="chart-widget__type-toggle">
							<button
								type="button"
								aria-label="Bar chart"
								className={chartType === "bar" ? "active" : ""}
								onClick={() => setChartType("bar")}
							>
								<Icon name="metric" size={13} />
							</button>
							<button
								type="button"
								aria-label="Line chart"
								className={chartType === "line" ? "active" : ""}
								onClick={() => setChartType("line")}
							>
								<Icon name="kpi" size={13} />
							</button>
						</div>
					)}
					{(dateDrill.length > 0 || catalogDrill.length > 0) && (
						<div className="chart-widget__breadcrumb">
							{breadcrumb.map((b, i) => (
								<span key={i}>
									{i > 0 && <Icon name="chevron-down" size={9} className="chart-widget__breadcrumb-sep" />}
									<button type="button" onClick={b.onClick}>
										{b.label}
									</button>
								</span>
							))}
						</div>
					)}
					<span className="chart-widget__toolbar-by">Top</span>
					<select className="select-sm" value={topN} onChange={(e) => setTopN(Number(e.target.value))} title="Visual-level Top N filter">
						{TOP_N_OPTIONS.map((n) => (
							<option key={n} value={n}>
								{n === 999 ? "All" : n}
							</option>
						))}
					</select>
					{Object.keys(whatIfParams).length > 0 && (
						<select
							className="select-sm"
							value={whatIfId}
							onChange={(e) => setWhatIfId(e.target.value)}
							title="Apply a what-if parameter's adjustment to this chart"
						>
							<option value="">What-if: none</option>
							{Object.entries(whatIfParams).map(([id, p]) => (
								<option key={id} value={id} disabled={p.unit !== "percent"}>
									What-if: {p.label}
								</option>
							))}
						</select>
					)}
				</div>
			}
		>
			{series.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
			{series.length > 0 && showLine && (
				<div className="chart-widget__line" role="img" aria-label={`${measureDef.label} trend`}>
					<svg viewBox="0 0 300 120" preserveAspectRatio="none" className="chart-widget__line-svg">
						<polyline
							points={linePoints.map((p) => `${p.x},${p.y}`).join(" ")}
							fill="none"
							stroke="var(--color-primary)"
							strokeWidth="2"
						/>
						{linePoints.map(({ x, y, point }) => (
							<circle
								key={point.label}
								cx={x}
								cy={y}
								r={canDrillDown ? 4 : 3}
								className="chart-widget__line-point"
								onClick={() => handlePointClick(point)}
							>
								<title>{`${point.label}: ${formatMeasureValue(point.value, measureDef.format)}`}</title>
							</circle>
						))}
					</svg>
					<div className="chart-widget__line-labels">
						<span>{series[0]?.label}</span>
						<span>{series[series.length - 1]?.label}</span>
					</div>
				</div>
			)}
			{series.length > 0 && !showLine && (
				<div className="chart-widget__chart" role="img" aria-label={`${measureDef.label} by ${dimension}`}>
					{series.map((point) => {
						const isActive = dimension !== "date" && crossFilters.some((f) => f.dimension === dimension && f.value === point.label);
						const pct = (point.value / maxValue) * 100;
						return (
							<button
								type="button"
								key={point.label}
								className={isActive ? "chart-widget__bar-row chart-widget__bar-row--active" : "chart-widget__bar-row"}
								onClick={() => handlePointClick(point)}
								title={`${point.label}: ${formatMeasureValue(point.value, measureDef.format)}`}
							>
								<span className="chart-widget__bar-label">{point.label}</span>
								<span className="chart-widget__bar-track">
									<span className="chart-widget__bar-fill" style={{ width: `${pct}%` }} />
								</span>
								<span className="chart-widget__bar-value">{formatMeasureValue(point.value, measureDef.format)}</span>
							</button>
						);
					})}
				</div>
			)}
		</WidgetCard>
	);
}
