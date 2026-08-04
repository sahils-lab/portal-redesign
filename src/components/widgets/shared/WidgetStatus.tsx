/**
 * Shared loading/error states. The real Portal's Statement widget had a bug
 * where the failure UI destroyed the working grid/engine underneath it,
 * killing Retry/New Run. Rendering error state as an overlay (never
 * unmounting the underlying widget) sidesteps that entire bug class by
 * construction rather than by careful discipline in every widget.
 */

export function WidgetLoading() {
	return <div className="widget-status widget-status--loading">Loading…</div>;
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
