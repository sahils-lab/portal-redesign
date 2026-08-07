/**
 * Small hand-rolled icon set — deliberately not pulling in an icon library
 * for a handful of glyphs. Simple, monochrome, stroke-based, consistent
 * 20x20 viewbox.
 */

export type IconName =
	| "container"
	| "title"
	| "label"
	| "divider"
	| "stepper"
	| "info"
	| "kpi"
	| "metric"
	| "statement"
	| "filter"
	| "recon"
	| "filebox"
	| "databox"
	| "query"
	| "input-table"
	| "view-table"
	| "alert"
	| "waterfall"
	| "matrix"
	| "whatif"
	| "chevron-down"
	| "plus"
	| "trash"
	| "download"
	| "expand"
	| "collapse"
	| "close"
	| "check";

const paths: Record<IconName, string> = {
	container: "M3 4h14v12H3z M3 8h14",
	title: "M4 5h12 M10 5v10",
	label: "M4 6h9l3 4-3 4H4z",
	divider: "M3 10h14",
	stepper: "M3 5h4v4H3z M8 7h9 M3 11h4v4H3z M8 13h9",
	info: "M10 4a6 6 0 100 12 6 6 0 000-12z M10 8v5 M10 6.5v.01",
	kpi: "M4 14l3-4 3 2 4-6 2 3",
	metric: "M4 16V9 M8 16V5 M12 16v-7 M16 16V3",
	statement: "M5 3h7l3 3v11H5z M12 3v3h3 M7 9h6 M7 12h6 M7 15h4",
	filter: "M4 4h12l-4.5 6v5l-3 2v-7z",
	recon: "M5 10a5 5 0 019-3 M15 10a5 5 0 01-9 3 M13 4v3h-3 M7 16v-3h3",
	filebox: "M4 6h4l1.5 2H16v8H4z",
	databox: "M4 5h12v3H4z M4 9h12v3H4z M4 13h12v3H4z",
	query: "M9 4a5 5 0 100 10 5 5 0 000-10z M12.5 12.5L16 16",
	"input-table": "M3 5h14v10H3z M3 9h14 M8 5v10",
	"view-table": "M3 5h14v10H3z M3 9h14 M3 12h14 M8 5v10",
	alert: "M10 3l8 14H2z M10 8v4 M10 14.5v.01",
	waterfall: "M3 16V12h3v4z M8 16V6h3v10z M13 16V9h3v7z M3 3v13h14",
	matrix: "M3 4h14v12H3z M3 8h14 M3 12h14 M8 4v12 M13 4v12",
	whatif: "M4 10h12 M7 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
	"chevron-down": "M5 7.5l5 5 5-5",
	plus: "M10 4v12 M4 10h12",
	trash: "M4 6h12 M8 6V4h4v2 M6 6l1 10h6l1-10",
	download: "M10 3v9 M6.5 8.5L10 12l3.5-3.5 M4 15h12",
	expand: "M4 8V4h4 M16 12v4h-4 M4 4l5 5 M16 16l-5-5",
	collapse: "M8 4v4H4 M12 16v-4h4 M4 4l5 5 M16 16l-5-5",
	close: "M5 5l10 10 M15 5L5 15",
	check: "M4 10.5l4 4 8-9",
};

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			<path d={paths[name]} />
		</svg>
	);
}
