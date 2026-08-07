import { createContext, useContext, useState, type ReactNode } from "react";
import type { DataMode } from "../types/widget";

/**
 * A dashboard-wide cross-filter: click a data point in one widget, every
 * other widget that shares that dimension reacts. Scoped to
 * `{ dimension, value }` (not a widget id) on
 * purpose — the real Portal codebase had a documented bug
 * (portal-widget-filter-column-identity-mismatch) where widget-id space and
 * worksheet-id space got conflated. Filtering by dimension *value* sidesteps
 * that whole bug class: any widget that understands the "region" dimension
 * can react, with no widget-identity lookup involved.
 *
 * Multiple entries can be active AT ONCE, across DIFFERENT dimensions
 * (click a product bar, then a seller bar — both apply, ANDed together, the
 * same way a Power BI-style multi-visual selection works). Within the SAME
 * dimension, selecting a new value replaces the old one rather than
 * stacking (single-select per field); clicking the same value again clears
 * it. One list, one set of rules, instead of a parallel single-filter and
 * multi-filter mechanism.
 */
export interface CrossFilter {
	dimension: string;
	value: string;
}

/** A registered What-if parameter's live state — see WhatIfWidget and WhatIfWidgetConfig. */
export interface WhatIfParam {
	label: string;
	value: number;
	unit: "percent" | "number";
}

interface PortalContextValue {
	dataMode: DataMode;
	setDataMode: (mode: DataMode) => void;
	crossFilters: CrossFilter[];
	/** Add/replace-within-dimension, or clear if the same {dimension, value} is already active. */
	toggleCrossFilter: (filter: CrossFilter) => void;
	isCrossFiltered: (dimension: string, value: string) => boolean;
	/** The active value for a dimension, if any — for widgets that only care about one dimension (e.g. KPI's region narrowing). */
	crossFilterValue: (dimension: string) => string | null;
	clearCrossFilters: () => void;
	clearCrossFilterDimension: (dimension: string) => void;
	/** Bulk-replace every active cross-filter at once — used to restore a saved bookmark. Named distinctly from `utils/analytics.ts`'s `applyCrossFilters` (which filters rows, not state) to avoid an import collision. */
	restoreCrossFilters: (next: CrossFilter[]) => void;
	/** Every What-if parameter currently on the page, keyed by parameterId — populated by WhatIfWidget instances mounting/unmounting, read by any Chart/Table widget that wants to apply one. */
	whatIfParams: Record<string, WhatIfParam>;
	registerWhatIf: (id: string, param: WhatIfParam) => void;
	setWhatIfValue: (id: string, value: number) => void;
	unregisterWhatIf: (id: string) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children, initialMode = "live" }: { children: ReactNode; initialMode?: DataMode }) {
	const [dataMode, setDataMode] = useState<DataMode>(initialMode);
	const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([]);
	const [whatIfParams, setWhatIfParams] = useState<Record<string, WhatIfParam>>({});

	const toggleCrossFilter = (filter: CrossFilter) => {
		setCrossFilters((current) => {
			const withoutDim = current.filter((f) => f.dimension !== filter.dimension);
			const alreadyActive = current.some((f) => f.dimension === filter.dimension && f.value === filter.value);
			return alreadyActive ? withoutDim : [...withoutDim, filter];
		});
	};
	const isCrossFiltered = (dimension: string, value: string) =>
		crossFilters.some((f) => f.dimension === dimension && f.value === value);
	const crossFilterValue = (dimension: string) => crossFilters.find((f) => f.dimension === dimension)?.value ?? null;
	const clearCrossFilters = () => setCrossFilters([]);
	const clearCrossFilterDimension = (dimension: string) =>
		setCrossFilters((current) => current.filter((f) => f.dimension !== dimension));
	const restoreCrossFilters = (next: CrossFilter[]) => setCrossFilters(next);

	const registerWhatIf = (id: string, param: WhatIfParam) =>
		setWhatIfParams((current) => (id in current ? current : { ...current, [id]: param }));
	const setWhatIfValue = (id: string, value: number) =>
		setWhatIfParams((current) => (current[id] ? { ...current, [id]: { ...current[id], value } } : current));
	const unregisterWhatIf = (id: string) =>
		setWhatIfParams((current) => {
			if (!(id in current)) return current;
			const next = { ...current };
			delete next[id];
			return next;
		});

	return (
		<PortalContext.Provider
			value={{
				dataMode,
				setDataMode,
				crossFilters,
				toggleCrossFilter,
				isCrossFiltered,
				crossFilterValue,
				clearCrossFilters,
				clearCrossFilterDimension,
				restoreCrossFilters,
				whatIfParams,
				registerWhatIf,
				setWhatIfValue,
				unregisterWhatIf,
			}}
		>
			{children}
		</PortalContext.Provider>
	);
}

/**
 * The single source of truth for "are we showing live or published data"
 * AND for the active cross-filter set — this is the fix for the real
 * Portal's biggest pain point, where the live/published decision was
 * independently reimplemented (and drifted) across 4+ files. Every widget
 * reads this instead of computing its own answer.
 */
export function usePortalContext(): PortalContextValue {
	const ctx = useContext(PortalContext);
	if (!ctx) {
		throw new Error("usePortalContext must be used within a PortalProvider");
	}
	return ctx;
}
