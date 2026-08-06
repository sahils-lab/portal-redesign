import { useMemo } from "react";
import { useGlobalFilters, type MultiSelectDim } from "../../context/FilterContext";
import { REGIONS, BUSINESS_UNITS, WAREHOUSES, WAREHOUSES_BY_REGION, CATEGORIES, BRANDS, SELLERS } from "../../mocks/salesData";
import { DIMENSIONS } from "../../utils/analytics";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { Icon } from "../icons/Icon";

const DIM_OPTIONS: Record<MultiSelectDim, readonly string[]> = {
	region: REGIONS,
	businessUnit: BUSINESS_UNITS,
	warehouse: WAREHOUSES,
	category: CATEGORIES,
	brand: BRANDS,
	seller: SELLERS,
};

/**
 * Rich, persistent filter bar — Date range, Region, Business Unit,
 * Warehouse, Category, Brand, Seller — synchronized across every dashboard
 * page via FilterContext (not per-widget state). Warehouse cascades off
 * Region (picking a region narrows the warehouse list to the ones that
 * actually belong to it) since that's the one real parent/child
 * relationship in this dimension set.
 */
export function GlobalFilterBar() {
	const { filters, setDateRange, setValues, toggleValue, resetAll, activeCount } = useGlobalFilters();

	const warehouseOptions = useMemo(() => {
		if (filters.region.length === 0) return WAREHOUSES;
		return filters.region.flatMap((r) => WAREHOUSES_BY_REGION[r] ?? []);
	}, [filters.region]);

	const dims: { key: MultiSelectDim; options: readonly string[] }[] = [
		{ key: "region", options: DIM_OPTIONS.region },
		{ key: "businessUnit", options: DIM_OPTIONS.businessUnit },
		{ key: "warehouse", options: warehouseOptions },
		{ key: "category", options: DIM_OPTIONS.category },
		{ key: "brand", options: DIM_OPTIONS.brand },
		{ key: "seller", options: DIM_OPTIONS.seller },
	];

	const chips: { key: string; label: string; onRemove: () => void }[] = [];
	if (filters.dateFrom || filters.dateTo) {
		chips.push({
			key: "date",
			label: `${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`,
			onRemove: () => setDateRange(null, null),
		});
	}
	for (const dim of dims) {
		for (const value of filters[dim.key]) {
			chips.push({
				key: `${dim.key}:${value}`,
				label: `${DIMENSIONS[dim.key].label}: ${value}`,
				onRemove: () => toggleValue(dim.key, value),
			});
		}
	}

	return (
		<div className="filter-bar">
			<div className="filter-bar__row">
				<Icon name="filter" size={13} />
				<input
					type="date"
					className="filter-bar__date"
					value={filters.dateFrom ?? ""}
					onChange={(e) => setDateRange(e.target.value || null, filters.dateTo)}
				/>
				<span className="filter-bar__date-sep">→</span>
				<input
					type="date"
					className="filter-bar__date"
					value={filters.dateTo ?? ""}
					onChange={(e) => setDateRange(filters.dateFrom, e.target.value || null)}
				/>
				{dims.map((dim) => (
					<MultiSelectFilter
						key={dim.key}
						label={DIMENSIONS[dim.key].label}
						options={dim.options as string[]}
						selected={filters[dim.key]}
						onChange={(values) => setValues(dim.key, values)}
					/>
				))}
				<div className="filter-bar__spacer" />
				<button type="button" className="link-btn" onClick={resetAll} disabled={activeCount === 0}>
					Reset all
				</button>
			</div>
			{chips.length > 0 && (
				<div className="filter-bar__chips">
					{chips.map((chip) => (
						<button key={chip.key} type="button" className="filter-chip" onClick={chip.onRemove}>
							{chip.label} <Icon name="close" size={9} />
						</button>
					))}
				</div>
			)}
		</div>
	);
}
