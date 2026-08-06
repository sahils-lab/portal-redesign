import { useState } from "react";
import type { KPIWidgetConfig, KPIData } from "../../../types/widget";
import { useWidgetData } from "../../../hooks/useWidgetData";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";
import { WidgetLoading, WidgetError } from "../shared/WidgetStatus";
import { Sparkline } from "../shared/Sparkline";
import { downloadCsv } from "../../../utils/exportCsv";
import { getTargetStatus, targetProgressPct } from "../../../utils/conditionalFormatting";
import { Icon } from "../../icons/Icon";

const DIMENSION = "region";

function formatValue(value: number, format: KPIWidgetConfig["valueFormat"], currency: string | null): string {
	if (format === "currency") return `${currency ?? "$"}${value.toLocaleString()}`;
	if (format === "percent") return `${value}%`;
	return value.toLocaleString();
}

/**
 * Reacts to the dashboard-wide cross-filter set by MetricWidget/Chart/Table
 * — narrows to a single region's value when active and known. Also an
 * interactive KPI card in its own right: sparkline of recent periods,
 * target status color (conditional formatting), and click-to-drill into
 * the region breakdown.
 */
export function KPIWidget({ config }: { config: KPIWidgetConfig }) {
	const { status, data, error, source, retry } = useWidgetData<KPIData>("kpi", config.metricId);
	const { crossFilterValue, toggleCrossFilter, clearCrossFilterDimension } = usePortalContext();
	const [expanded, setExpanded] = useState(false);

	const activeRegion = crossFilterValue(DIMENSION);
	const filteredValue = activeRegion && data?.byRegion ? data.byRegion[activeRegion] : undefined;
	const displayValue = filteredValue ?? data?.value;
	const canDrill = !!data?.byRegion && Object.keys(data.byRegion).length > 0;

	const handleExport = () => {
		if (!data) return;
		downloadCsv(config.title, [
			["metric", "value", "previousValue", "currency", "target"],
			[config.title, String(data.value), String(data.previousValue ?? ""), data.currency ?? "", String(data.target ?? "")],
		]);
	};

	const targetStatus = data?.target ? getTargetStatus(data.value, data.target) : null;
	const targetPct = data?.target ? targetProgressPct(data.value, data.target) : null;

	return (
		<WidgetCard
			title={config.title}
			sourceBadge={source === "published" ? "Published" : undefined}
			onExport={status === "success" && data ? handleExport : undefined}
			tooltip={[
				{ label: "Metric", value: config.metricId },
				{ label: "Format", value: config.valueFormat },
				{ label: "Source", value: source === "published" ? "Published snapshot" : "Live" },
				...(data?.target ? [{ label: "Target", value: formatValue(data.target, config.valueFormat, data.currency) }] : []),
			]}
		>
			{status === "loading" && <WidgetLoading />}
			{status === "error" && <WidgetError message={error ?? "Something went wrong"} onRetry={retry} />}
			{status === "success" && data && displayValue !== undefined && (
				<div className="kpi-widget">
					<button
						type="button"
						className="kpi-widget__value"
						onClick={() => canDrill && setExpanded((v) => !v)}
						aria-expanded={expanded}
						title={canDrill ? "Click to break down by region" : undefined}
					>
						{formatValue(displayValue, config.valueFormat, data.currency)}
						{filteredValue === undefined && data.previousValue !== null && (
							<span className="kpi-widget__delta">
								{data.value >= data.previousValue ? "▲" : "▼"}{" "}
								{Math.abs(((data.value - data.previousValue) / data.previousValue) * 100).toFixed(1)}%
							</span>
						)}
						{filteredValue !== undefined && (
							<span
								className="kpi-widget__filter-chip"
								onClick={(e) => {
									e.stopPropagation();
									clearCrossFilterDimension(DIMENSION);
								}}
							>
								Filtered: {activeRegion} ✕
							</span>
						)}
					</button>

					<div className="kpi-widget__meta">
						{data.trend && data.trend.length > 1 && <Sparkline values={data.trend} />}
						{targetStatus && targetPct !== null && (
							<span className={`kpi-widget__target kpi-widget__target--${targetStatus}`}>
								<Icon name={targetStatus === "success" ? "check" : "alert"} size={11} />
								{targetPct}% of target
							</span>
						)}
					</div>

					{expanded && data.byRegion && (
						<div className="kpi-widget__breakdown">
							{Object.entries(data.byRegion)
								.sort((a, b) => b[1] - a[1])
								.map(([region, value]) => {
									const max = Math.max(...Object.values(data.byRegion!));
									return (
										<button
											type="button"
											key={region}
											className="kpi-widget__breakdown-row"
											onClick={(e) => {
												e.stopPropagation();
												toggleCrossFilter({ dimension: DIMENSION, value: region });
											}}
										>
											<span className="kpi-widget__breakdown-label">{region}</span>
											<span className="kpi-widget__breakdown-track">
												<span className="kpi-widget__breakdown-fill" style={{ width: `${(value / max) * 100}%` }} />
											</span>
											<span className="kpi-widget__breakdown-value">{formatValue(value, config.valueFormat, data.currency)}</span>
										</button>
									);
								})}
						</div>
					)}
				</div>
			)}
		</WidgetCard>
	);
}
