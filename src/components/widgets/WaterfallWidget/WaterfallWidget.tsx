import { useMemo, useState } from "react";
import type { WaterfallWidgetConfig } from "../../../types/widget";
import type { MeasureKey, DimensionKey } from "../../../types/analytics";
import { useGlobalFilters } from "../../../context/FilterContext";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";
import { salesRows } from "../../../mocks/salesData";
import {
	MEASURES,
	DIMENSIONS,
	applyGlobalFilters,
	applyCrossFilters,
	aggregateBy,
	aggregateByDateGrain,
	formatMeasureValue,
} from "../../../utils/analytics";
import { downloadCsv } from "../../../utils/exportCsv";

const MEASURE_OPTIONS = Object.values(MEASURES);
const DIMENSION_OPTIONS: (DimensionKey | "date")[] = ["date", ...(Object.keys(DIMENSIONS) as DimensionKey[])];
const DEFAULT_TOP_N = 8;

interface Bar {
	label: string;
	start: number;
	end: number;
	delta: number;
	kind: "increase" | "decrease" | "total";
}

const VIEW_W = 320;
const VIEW_H = 150;
const AXIS_Y = 130;
const CHART_H = 110;

/**
 * Bridge/waterfall chart: each bucket's own value is a floating bar stacked
 * on the running total (green = positive contribution, red = negative),
 * ending in an explicit "Total" bar — Power BI's standard "how do these
 * parts build up to the whole" shape. Distinct from ChartWidget's bar chart
 * (which shows each bucket's value independently, not cumulatively).
 */
export function WaterfallWidget({ config }: { config: WaterfallWidgetConfig }) {
	const [measure, setMeasure] = useState<MeasureKey>(config.measure);
	const [dimension, setDimension] = useState<DimensionKey | "date">(config.dimension);
	const { filters } = useGlobalFilters();
	const { crossFilters } = usePortalContext();

	const rows = useMemo(() => {
		let r = applyGlobalFilters(salesRows, filters);
		r = applyCrossFilters(r, crossFilters);
		return r;
	}, [filters, crossFilters]);

	const topN = config.topN ?? DEFAULT_TOP_N;
	const measureDef = MEASURES[measure];

	const points = useMemo(() => {
		if (dimension === "date") return aggregateByDateGrain(rows, config.dateGrain, measure).slice(-topN);
		return aggregateBy(rows, dimension, measure).slice(0, topN);
	}, [rows, dimension, measure, config.dateGrain, topN]);

	const bars: Bar[] = useMemo(() => {
		let running = 0;
		const out: Bar[] = points.map((p) => {
			const start = running;
			running += p.value;
			return { label: p.label, start, end: running, delta: p.value, kind: p.value >= 0 ? "increase" : "decrease" };
		});
		out.push({ label: "Total", start: 0, end: running, delta: running, kind: "total" });
		return out;
	}, [points]);

	const dimensionLabel = dimension === "date" ? "Period" : DIMENSIONS[dimension].label;

	const handleExport = () => {
		downloadCsv(config.title, [
			[dimensionLabel, measureDef.label],
			...bars.map((b) => [b.label, String(b.delta)]),
		]);
	};

	const allValues = bars.flatMap((b) => [b.start, b.end]);
	const maxVal = Math.max(1, ...allValues);
	const minVal = Math.min(0, ...allValues);
	const range = maxVal - minVal || 1;
	const y = (v: number) => AXIS_Y - ((v - minVal) / range) * CHART_H;
	const barGap = 6;
	const barW = bars.length > 0 ? Math.max(10, VIEW_W / bars.length - barGap) : 10;

	return (
		<WidgetCard
			title={config.title}
			onExport={bars.length > 1 ? handleExport : undefined}
			tooltip={[
				{ label: "Measure", value: measureDef.label },
				{ label: "Bucketed by", value: dimensionLabel },
				{ label: "Buckets", value: String(points.length) },
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
						onChange={(e) => setDimension(e.target.value as DimensionKey | "date")}
					>
						{DIMENSION_OPTIONS.map((d) => (
							<option key={d} value={d}>
								{d === "date" ? "Date" : DIMENSIONS[d].label}
							</option>
						))}
					</select>
				</div>
			}
		>
			{points.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
			{points.length > 0 && (
				<div className="waterfall-widget">
					<svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="waterfall-widget__svg" role="img" aria-label={`${measureDef.label} bridge by ${dimensionLabel}`}>
						<line x1={0} y1={y(0)} x2={VIEW_W} y2={y(0)} className="waterfall-widget__zero-line" />
						{bars.map((b, i) => {
							const x = i * (barW + barGap) + barGap / 2;
							const top = Math.min(y(b.start), y(b.end));
							const h = Math.max(2, Math.abs(y(b.end) - y(b.start)));
							return (
								<g key={b.label}>
									<rect x={x} y={top} width={barW} height={h} rx={2} className={`waterfall-widget__bar waterfall-widget__bar--${b.kind}`}>
										<title>{`${b.label}: ${b.kind === "total" ? "" : b.delta >= 0 ? "+" : ""}${formatMeasureValue(b.delta, measureDef.format)}`}</title>
									</rect>
								</g>
							);
						})}
					</svg>
					<div className="waterfall-widget__labels">
						{bars.map((b) => (
							<span key={b.label} className={b.kind === "total" ? "waterfall-widget__labels-total" : ""}>
								{b.label}
							</span>
						))}
					</div>
				</div>
			)}
		</WidgetCard>
	);
}
