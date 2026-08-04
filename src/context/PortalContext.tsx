import { createContext, useContext, useState, type ReactNode } from "react";
import type { DataMode } from "../types/widget";

/**
 * A dashboard-wide cross-filter — Tableau's defining dashboard feature:
 * click a data point in one widget, every other widget that shares that
 * dimension reacts. Scoped to `{ dimension, value }` (not a widget id) on
 * purpose — the real Portal codebase had a documented bug
 * (portal-widget-filter-column-identity-mismatch) where widget-id space and
 * worksheet-id space got conflated. Filtering by dimension *value* sidesteps
 * that whole bug class: any widget that understands the "region" dimension
 * can react, with no widget-identity lookup involved.
 */
export interface CrossFilter {
	dimension: string;
	value: string;
}

interface PortalContextValue {
	dataMode: DataMode;
	setDataMode: (mode: DataMode) => void;
	crossFilter: CrossFilter | null;
	/** Passing the same filter that's already active clears it (click-to-toggle). */
	setCrossFilter: (filter: CrossFilter) => void;
	clearCrossFilter: () => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children, initialMode = "live" }: { children: ReactNode; initialMode?: DataMode }) {
	const [dataMode, setDataMode] = useState<DataMode>(initialMode);
	const [crossFilter, setCrossFilterState] = useState<CrossFilter | null>(null);

	const setCrossFilter = (filter: CrossFilter) => {
		setCrossFilterState((current) =>
			current && current.dimension === filter.dimension && current.value === filter.value ? null : filter
		);
	};
	const clearCrossFilter = () => setCrossFilterState(null);

	return (
		<PortalContext.Provider value={{ dataMode, setDataMode, crossFilter, setCrossFilter, clearCrossFilter }}>
			{children}
		</PortalContext.Provider>
	);
}

/**
 * The single source of truth for "are we showing live or published data"
 * AND for the active cross-filter — this is the fix for the real Portal's
 * biggest pain point, where the live/published decision was independently
 * reimplemented (and drifted) across 4+ files. Every widget reads this
 * instead of computing its own answer.
 */
export function usePortalContext(): PortalContextValue {
	const ctx = useContext(PortalContext);
	if (!ctx) {
		throw new Error("usePortalContext must be used within a PortalProvider");
	}
	return ctx;
}
