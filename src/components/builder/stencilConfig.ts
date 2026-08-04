import type { WidgetType } from "../../types/widget";
import type { IconName } from "../icons/Icon";

export interface StencilItem {
	key: string;
	label: string;
	icon: IconName;
	/** Widget type this stencil item creates, if it's actually wired up in this prototype. */
	widgetType?: WidgetType;
}

export interface StencilSection {
	title: string;
	items: StencilItem[];
}

/**
 * Mirrors the real Portal builder's stencil categories (Layout / Display /
 * Analysis / Data). Wired up so far: all of Display except Stepper, all of
 * Analysis except Filter, and Alert from Data (see docs/design-doc.md for
 * why — Filter and Stepper need cross-widget state this prototype doesn't
 * model yet, and Filebox/Databox/Query/tables need a "dataset" concept this
 * prototype doesn't have). Everything else still renders in the palette for
 * visual/structural fidelity but is flagged "not implemented" if clicked,
 * rather than being silently omitted.
 */
export const stencilSections: StencilSection[] = [
	{
		title: "Layout",
		items: [{ key: "container", label: "Container", icon: "container" }],
	},
	{
		title: "Display",
		items: [
			{ key: "title", label: "Title", icon: "title", widgetType: "title" },
			{ key: "label", label: "Label", icon: "label", widgetType: "label" },
			{ key: "divider", label: "Divider", icon: "divider", widgetType: "divider" },
			{ key: "stepper", label: "Stepper", icon: "stepper" },
			{ key: "info-display", label: "Info display", icon: "info", widgetType: "info" },
		],
	},
	{
		title: "Analysis",
		items: [
			{ key: "kpi", label: "KPI", icon: "kpi", widgetType: "kpi" },
			{ key: "metric", label: "Metric", icon: "metric", widgetType: "metric" },
			{ key: "statement", label: "Statement", icon: "statement", widgetType: "report" },
			{ key: "filter", label: "Filter", icon: "filter" },
			{ key: "recon-summary", label: "Recon summary", icon: "recon", widgetType: "recon" },
		],
	},
	{
		title: "Data",
		items: [
			{ key: "filebox", label: "Filebox", icon: "filebox" },
			{ key: "databox", label: "Databox", icon: "databox" },
			{ key: "query", label: "Query", icon: "query" },
			{ key: "input-table", label: "Input table", icon: "input-table" },
			{ key: "view-table", label: "View table", icon: "view-table" },
			{ key: "alert", label: "Alert", icon: "alert", widgetType: "alert" },
		],
	},
];
