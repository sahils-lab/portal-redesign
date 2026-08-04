import type { ReactNode } from "react";

interface WidgetCardProps {
	title: string;
	sourceBadge?: string;
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
export function WidgetCard({ title, sourceBadge, children }: WidgetCardProps) {
	return (
		<div className="widget-card">
			<div className="widget-card__header">
				<span className="widget-card__title">{title}</span>
				{sourceBadge && <span className="widget-card__badge">{sourceBadge}</span>}
			</div>
			<div className="widget-card__body">{children}</div>
		</div>
	);
}
