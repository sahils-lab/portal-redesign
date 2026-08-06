/**
 * Conditional formatting — small, generic rule-based helpers that turn a
 * number into a status color/icon. Shared across KPI cards (target
 * achievement) and could extend to Chart/Table cells later; kept separate
 * from `analytics.ts` since it's a presentation concern, not a query one.
 */

export type FormatStatus = "success" | "warning" | "danger";

/** value/target >= 100% -> on track, 80-99% -> at risk, below 80% -> behind. Same thresholds Power BI-style KPI visuals default to. */
export function getTargetStatus(value: number, target: number): FormatStatus {
	const pct = target === 0 ? 1 : value / target;
	if (pct >= 1) return "success";
	if (pct >= 0.8) return "warning";
	return "danger";
}

export function targetProgressPct(value: number, target: number): number {
	if (target === 0) return 100;
	return Math.round((value / target) * 100);
}
