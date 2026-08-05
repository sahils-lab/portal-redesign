/**
 * Shared loading/error states. The real Portal's Statement widget had a bug
 * where the failure UI destroyed the working grid/engine underneath it,
 * killing Retry/New Run. Rendering error state as an overlay (never
 * unmounting the underlying widget) sidesteps that entire bug class by
 * construction rather than by careful discipline in every widget.
 *
 * Loading is a shimmering skeleton, not plain "Loading…" text — shape-matched
 * to a generic card body so it doesn't jump when real content swaps in.
 */

export function WidgetLoading() {
	return (
		<div className="widget-skeleton">
			<div className="widget-skeleton__bar widget-skeleton__bar--lg" />
			<div className="widget-skeleton__bar widget-skeleton__bar--md" />
			<div className="widget-skeleton__bar widget-skeleton__bar--sm" />
		</div>
	);
}

export function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="widget-status widget-status--error">
			<p>{message}</p>
			<button type="button" onClick={onRetry}>
				Retry
			</button>
		</div>
	);
}
