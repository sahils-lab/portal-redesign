import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";

interface WidgetCardProps {
	title: string;
	sourceBadge?: string;
	/** Present only when the widget has loaded data worth exporting — a one-click "export this widget's data" affordance, scaled down to CSV. */
	onExport?: () => void;
	/** Hover-only metadata (data source, aggregation, freshness), shown in a small info popover on hover. */
	tooltip?: { label: string; value: string }[];
	children: ReactNode;
}

/**
 * Shared visual shell for every widget type. In the real Portal codebase,
 * KPI/Metric/Report each had their own card wrapper (with copy-pasted TODOs
 * like "fix to have one component" left unresolved), and Recon had no
 * shared wrapper at all — it was a single monolithic component. Here, every
 * widget renders through this one shell, so structural consistency is
 * enforced instead of hoped for.
 */
export function WidgetCard({ title, sourceBadge, onExport, tooltip, children }: WidgetCardProps) {
	return (
		<div className="widget-card">
			<div className="widget-card__header">
				<span className="widget-card__title">{title}</span>
				<div className="widget-card__header-actions">
					{sourceBadge && <span className="widget-card__badge">{sourceBadge}</span>}
					{tooltip && tooltip.length > 0 && (
						<span className="widget-card__tooltip-trigger" tabIndex={0} aria-label="Widget details">
							<Icon name="info" size={13} />
							<div className="widget-card__tooltip" role="tooltip">
								{tooltip.map((row) => (
									<div key={row.label} className="widget-card__tooltip-row">
										<span className="widget-card__tooltip-label">{row.label}</span>
										<span className="widget-card__tooltip-value">{row.value}</span>
									</div>
								))}
							</div>
						</span>
					)}
					{onExport && (
						<button
							type="button"
							className="widget-card__export"
							title="Download as CSV"
							aria-label="Download as CSV"
							onClick={(e) => {
								e.stopPropagation();
								onExport();
							}}
						>
							<Icon name="download" size={13} />
						</button>
					)}
				</div>
			</div>
			<div className="widget-card__body">{children}</div>
		</div>
	);
}
