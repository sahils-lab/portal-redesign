import type { ReconWidgetConfig, ReconData } from "../../../types/widget";
import { useWidgetData } from "../../../hooks/useWidgetData";
import { WidgetCard } from "../shared/WidgetCard";
import { WidgetLoading, WidgetError } from "../shared/WidgetStatus";

/**
 * In the real Portal codebase, Recon was the one widget type that didn't
 * follow the Container -> Card -> hook pattern the other three used — it was
 * a single monolithic component. Here it goes through the exact same
 * WidgetCard/useWidgetData pattern as KPI/Metric/Report, so there's no
 * structural odd-one-out.
 */
export function ReconWidget({ config }: { config: ReconWidgetConfig }) {
	const { status, data, error, source, retry } = useWidgetData<ReconData>("recon", config.reconId);

	return (
		<WidgetCard title={config.title} sourceBadge={source === "published" ? "Published" : undefined}>
			{status === "loading" && <WidgetLoading />}
			{status === "error" && <WidgetError message={error ?? "Something went wrong"} onRetry={retry} />}
			{status === "success" && data && (
				<div className="recon-widget">
					<div className="recon-widget__stat">
						<span>Matched</span>
						<strong>{data.matched}</strong>
					</div>
					<div className="recon-widget__stat">
						<span>Unmatched</span>
						<strong>{data.unmatched}</strong>
					</div>
					<div className="recon-widget__bar">
						<div
							className="recon-widget__bar-fill"
							style={{ width: `${(data.matched / data.total) * 100}%` }}
						/>
					</div>
				</div>
			)}
		</WidgetCard>
	);
}
