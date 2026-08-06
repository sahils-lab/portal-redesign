import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { GlobalFilters } from "../types/analytics";
import { EMPTY_GLOBAL_FILTERS } from "../types/analytics";

const STORAGE_KEY = "portal-redesign:global-filters";

/** The multi-select dimensions of GlobalFilters (everything except the date range). */
export type MultiSelectDim = "region" | "businessUnit" | "warehouse" | "category" | "brand" | "seller";

interface FilterContextValue {
	filters: GlobalFilters;
	setDateRange: (from: string | null, to: string | null) => void;
	setValues: (dim: MultiSelectDim, values: string[]) => void;
	toggleValue: (dim: MultiSelectDim, value: string) => void;
	resetAll: () => void;
	resetDim: (dim: MultiSelectDim) => void;
	/** Bulk-replace every filter at once — used to restore a saved bookmark. */
	applyAll: (next: GlobalFilters) => void;
	activeCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

function load(): GlobalFilters {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY_GLOBAL_FILTERS;
		return { ...EMPTY_GLOBAL_FILTERS, ...(JSON.parse(raw) as Partial<GlobalFilters>) };
	} catch {
		return EMPTY_GLOBAL_FILTERS;
	}
}

/**
 * Global sync filters — Date / Region / Business Unit / Warehouse / Category
 * / Brand / Seller stay applied across every page of the dashboard (unlike
 * the per-click cross-filter in PortalContext, which is transient and
 * page-scoped). Persisted to localStorage so filters survive a reload, the
 * same draft-durability idea as the builder's autosave.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
	const [filters, setFilters] = useState<GlobalFilters>(() => load());

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
		} catch {
			// Storage disabled — non-critical for a prototype.
		}
	}, [filters]);

	const setDateRange = (from: string | null, to: string | null) => {
		setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
	};

	const setValues = (dim: MultiSelectDim, values: string[]) => {
		setFilters((f) => ({ ...f, [dim]: values }));
	};

	const toggleValue = (dim: MultiSelectDim, value: string) => {
		setFilters((f) => {
			const current = f[dim];
			const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
			return { ...f, [dim]: next };
		});
	};

	const resetDim = (dim: MultiSelectDim) => setFilters((f) => ({ ...f, [dim]: [] }));

	const resetAll = () => setFilters(EMPTY_GLOBAL_FILTERS);
	const applyAll = (next: GlobalFilters) => setFilters(next);

	const activeCount =
		(filters.dateFrom || filters.dateTo ? 1 : 0) +
		filters.region.length +
		filters.businessUnit.length +
		filters.warehouse.length +
		filters.category.length +
		filters.brand.length +
		filters.seller.length;

	return (
		<FilterContext.Provider
			value={{ filters, setDateRange, setValues, toggleValue, resetAll, resetDim, applyAll, activeCount }}
		>
			{children}
		</FilterContext.Provider>
	);
}

export function useGlobalFilters(): FilterContextValue {
	const ctx = useContext(FilterContext);
	if (!ctx) throw new Error("useGlobalFilters must be used within a FilterProvider");
	return ctx;
}
