import type { MetricWidgetConfig, MetricData } from "../../../types/widget";
import { useWidgetData } from "../../../hooks/useWidgetData";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";
import { WidgetLoading, WidgetError } from "../shared/WidgetStatus";
import { downloadCsv } from "../../../utils/exportCsv";

const DIMENSION = "region";

/**
 * Rows are clickable to drive the dashboard-wide cross-filter — click a
 * region row, every widget that understands the "region" dimension reacts
 * (see KPIWidget). Click the same row again to clear the filter.
 */
export function MetricWidget({ config }: { config: MetricWidgetConfig }) {
	const { status, data, error, source, retry } = useWidgetData<MetricData>("metric", config.metricId);
	const { isCrossFiltered, toggleCrossFilter } = usePortalContext();

	const handleExport = () => {
		if (!data) return;
		const header = ["region", ...data.columns];
		const rows = data.rows.map((row) => [row.label, ...data.columns.map((col) => String(row.values[col] ?? ""))]);
		downloadCsv(config.title, [header, ...rows]);
	};

	return (
		<WidgetCard
			title={config.title}
			sourceBadge={source === "published" ? "Published" : undefined}
			onExport={status === "success" && data ? handleExport : undefined}
			tooltip={[
				{ label: "Metric", value: config.metricId },
				{ label: "Rows", value: config.rowGroups.join(", ") },
				{ label: "Columns", value: config.valueCols.join(", ") },
				{ label: "Source", value: source === "published" ? "Published snapshot" : "Live" },
			]}
		>
			{status === "loading" && <WidgetLoading />}
			{status === "error" && <WidgetError message={error ?? "Something went wrong"} onRetry={retry} />}
			{status === "success" && data && (
				<table className="metric-widget__table">
					<thead>
						<tr>
							<th />
							{data.columns.map((col) => (
								<th key={col}>{col}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.rows.map((row) => {
							const isActive = isCrossFiltered(DIMENSION, row.label);
							return (
								<tr
									key={row.label}
									className={isActive ? "metric-widget__row metric-widget__row--active" : "metric-widget__row"}
									onClick={() => toggleCrossFilter({ dimension: DIMENSION, value: row.label })}
									title={`Filter dashboard by ${row.label}`}
								>
									<td>{row.label}</td>
									{data.columns.map((col) => (
										<td key={col}>{row.values[col]?.toLocaleString() ?? "—"}</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</WidgetCard>
	);
}
