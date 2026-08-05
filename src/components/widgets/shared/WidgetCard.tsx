import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";

interface WidgetCardProps {
	title: string;
	sourceBadge?: string;
	/** Present only when the widget has loaded data worth exporting — Tableau's "Download > Crosstab", scaled down to CSV. */
	onExport?: () => void;
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
export function WidgetCard({ title, sourceBadge, onExport, children }: WidgetCardProps) {
	return (
		<div className="widget-card">
			<div className="widget-card__header">
				<span className="widget-card__title">{title}</span>
				<div className="widget-card__header-actions">
					{sourceBadge && <span className="widget-card__badge">{sourceBadge}</span>}
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
