import type { ReportWidgetConfig, ReportData } from "../../../types/widget";
import { useWidgetData } from "../../../hooks/useWidgetData";
import { WidgetCard } from "../shared/WidgetCard";
import { WidgetLoading, WidgetError } from "../shared/WidgetStatus";

export function ReportWidget({ config }: { config: ReportWidgetConfig }) {
	const { status, data, error, source, retry } = useWidgetData<ReportData>("report", config.statementId);

	return (
		<WidgetCard title={config.title} sourceBadge={source === "published" ? "Published" : undefined}>
			{status === "loading" && <WidgetLoading />}
			{status === "error" && <WidgetError message={error ?? "Something went wrong"} onRetry={retry} />}
			{status === "success" && data && (
				<div className="report-widget">
					{data.sections.map((section) => (
						<div key={section.title} className="report-widget__section">
							<h4>{section.title}</h4>
							{section.rows.map((row) => (
								<div key={row.label} className="report-widget__row">
									<span>{row.label}</span>
									<span>{row.value}</span>
								</div>
							))}
						</div>
					))}
				</div>
			)}
		</WidgetCard>
	);
}
