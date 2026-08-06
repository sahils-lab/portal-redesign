import { useMemo, useState } from "react";
import { Icon } from "../icons/Icon";

/**
 * Generic searchable, multi-select dropdown filter — used for every
 * dimension in the global filter bar (Region, Business Unit, Warehouse,
 * Category, Brand, Seller). One implementation instead of six near-copies.
 */
export function MultiSelectFilter({
	label,
	options,
	selected,
	onChange,
}: {
	label: string;
	options: string[];
	selected: string[];
	onChange: (values: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filtered = useMemo(
		() => (search.trim() ? options.filter((o) => o.toLowerCase().includes(search.trim().toLowerCase())) : options),
		[options, search]
	);

	const toggle = (value: string) => {
		onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
	};

	return (
		<div className="msf">
			<button
				type="button"
				className={selected.length ? "msf__trigger msf__trigger--active" : "msf__trigger"}
				onClick={() => setOpen((v) => !v)}
			>
				{label}
				{selected.length > 0 && <span className="msf__count">{selected.length}</span>}
				<Icon name="chevron-down" size={12} />
			</button>
			{open && (
				<>
					<div className="msf__backdrop" onClick={() => setOpen(false)} />
					<div className="msf__dropdown">
						<input
							className="msf__search"
							placeholder={`Search ${label.toLowerCase()}…`}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							autoFocus
						/>
						<div className="msf__list">
							{filtered.length === 0 && <div className="msf__empty">No matches</div>}
							{filtered.map((option) => (
								<label key={option} className="msf__option">
									<input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
									{option}
								</label>
							))}
						</div>
						<div className="msf__footer">
							<button type="button" className="msf__footer-btn" onClick={() => onChange(filtered)}>
								Select all
							</button>
							<button type="button" className="msf__footer-btn" onClick={() => onChange([])} disabled={!selected.length}>
								Clear
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
