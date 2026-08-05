import type { KPIWidgetConfig, KPIData } from "../../../types/widget";
import { useWidgetData } from "../../../hooks/useWidgetData";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";
import { WidgetLoading, WidgetError } from "../shared/WidgetStatus";
import { downloadCsv } from "../../../utils/exportCsv";

const DIMENSION = "region";

function formatValue(value: number, format: KPIWidgetConfig["valueFormat"], currency: string | null): string {
	if (format === "currency") return `${currency ?? "$"}${value.toLocaleString()}`;
	if (format === "percent") return `${value}%`;
	return value.toLocaleString();
}

/** Reacts to the dashboard-wide cross-filter set by MetricWidget's rows — narrows to a single region's value when active and known. */
export function KPIWidget({ config }: { config: KPIWidgetConfig }) {
	const { status, data, error, source, retry } = useWidgetData<KPIData>("kpi", config.metricId);
	const { crossFilter, clearCrossFilter } = usePortalContext();

	const filteredValue =
		crossFilter?.dimension === DIMENSION && data?.byRegion ? data.byRegion[crossFilter.value] : undefined;
	const displayValue = filteredValue ?? data?.value;

	const handleExport = () => {
		if (!data) return;
		downloadCsv(config.title, [
			["metric", "value", "previousValue", "currency"],
			[config.title, String(data.value), String(data.previousValue ?? ""), data.currency ?? ""],
		]);
	};

	return (
		<WidgetCard
			title={config.title}
			sourceBadge={source === "published" ? "Published" : undefined}
			onExport={status === "success" && data ? handleExport : undefined}
		>
			{status === "loading" && <WidgetLoading />}
			{status === "error" && <WidgetError message={error ?? "Something went wrong"} onRetry={retry} />}
			{status === "success" && data && displayValue !== undefined && (
				<div className="kpi-widget__value">
					{formatValue(displayValue, config.valueFormat, data.currency)}
					{filteredValue === undefined && data.previousValue !== null && (
						<span className="kpi-widget__delta">
							{data.value >= data.previousValue ? "▲" : "▼"}{" "}
							{Math.abs(((data.value - data.previousValue) / data.previousValue) * 100).toFixed(1)}%
						</span>
					)}
					{filteredValue !== undefined && (
						<button
							type="button"
							className="kpi-widget__filter-chip"
							onClick={(e) => {
								e.stopPropagation();
								clearCrossFilter();
							}}
						>
							Filtered: {crossFilter?.value} ✕
						</button>
					)}
				</div>
			)}
		</WidgetCard>
	);
}
