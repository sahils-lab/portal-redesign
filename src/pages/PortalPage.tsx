import { useState } from "react";
import type { WidgetConfig } from "../types/widget";
import { PortalProvider } from "../context/PortalContext";
import { PortalCanvas } from "../components/PortalCanvas";
import { StencilPanel } from "../components/builder/StencilPanel";
import { PropertiesPanel } from "../components/builder/PropertiesPanel";
import { BuilderHeader } from "../components/builder/BuilderHeader";
import { createWidgetFromStencil } from "../components/builder/createWidget";
import { stencilSections, type StencilItem } from "../components/builder/stencilConfig";

function findStencilItem(key: string): StencilItem | undefined {
	for (const section of stencilSections) {
		const item = section.items.find((i) => i.key === key);
		if (item) return item;
	}
	return undefined;
}

const initialWidgets: WidgetConfig[] = [
	{
		id: "w0",
		type: "title",
		title: "Section title",
		grid: { x: 0, y: 0, w: 8, h: 1 },
		text: "Q3 Financial Overview",
		level: "h2",
	},
	{
		id: "w1",
		type: "kpi",
		title: "Revenue",
		grid: { x: 0, y: 1, w: 2, h: 1 },
		metricId: "metric-revenue",
		valueFormat: "currency",
	},
	{
		id: "w2",
		type: "metric",
		title: "Revenue by Region",
		grid: { x: 2, y: 1, w: 4, h: 2 },
		metricId: "metric-revenue",
		rowGroups: ["region"],
		valueCols: ["Q1", "Q2", "Q3"],
	},
	{
		id: "w3",
		type: "report",
		title: "Monthly Statement",
		grid: { x: 0, y: 2, w: 2, h: 2 },
		statementId: "statement-monthly",
	},
	{
		id: "w4",
		type: "recon",
		title: "Bank Reconciliation",
		grid: { x: 6, y: 1, w: 2, h: 2 },
		reconId: "recon-bank",
	},
	{
		id: "w5",
		type: "info",
		title: "Info note",
		grid: { x: 2, y: 4, w: 4, h: 1 },
		message: "Data refreshes automatically every 15 minutes.",
		severity: "info",
	},
	{
		id: "w6",
		type: "alert",
		title: "Alert",
		grid: { x: 6, y: 4, w: 2, h: 1 },
		message: "2 reconciliation items need review.",
		severity: "warning",
	},
];

export function PortalPage() {
	const [pageTitle, setPageTitle] = useState("Test2");
	const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	const handleAddWidget = (item: StencilItem) => {
		const created = createWidgetFromStencil(item, widgets);
		if (!created) {
			setToast(`"${item.label}" isn't implemented in this prototype yet.`);
			window.setTimeout(() => setToast(null), 2500);
			return;
		}
		setWidgets((prev) => [...prev, created]);
		setSelectedId(created.id);
	};

	/** Used by canvas drop handling — stencil items are identified by key over the DataTransfer wire format. */
	const handleAddWidgetByKey = (key: string) => {
		const item = findStencilItem(key);
		if (item) handleAddWidget(item);
	};

	const handleDeleteWidget = (id: string) => {
		setWidgets((prev) => prev.filter((w) => w.id !== id));
		setSelectedId((current) => (current === id ? null : current));
	};

	const handleUpdateWidget = (id: string, patch: Partial<WidgetConfig>) => {
		setWidgets((prev) => prev.map((w) => (w.id === id ? ({ ...w, ...patch } as WidgetConfig) : w)));
	};

	const handleMoveWidget = (id: string, position: { x: number; y: number }) => {
		setWidgets((prev) =>
			prev.map((w) => (w.id === id ? { ...w, grid: { ...w.grid, x: position.x, y: position.y } } : w))
		);
	};

	const handleResizeWidget = (id: string, size: { w: number; h: number }) => {
		setWidgets((prev) =>
			prev.map((w) => (w.id === id ? { ...w, grid: { ...w.grid, w: size.w, h: size.h } } : w))
		);
	};

	const selectedWidget = widgets.find((w) => w.id === selectedId) ?? null;

	return (
		<PortalProvider initialMode="live">
			<div className="portal-builder">
				<BuilderHeader title={pageTitle} onTitleChange={setPageTitle} published={false} />
				<div className="portal-builder__body">
					<StencilPanel onAddWidget={handleAddWidget} />
					<PortalCanvas
						widgets={widgets}
						selectedId={selectedId}
						onSelect={setSelectedId}
						onDelete={handleDeleteWidget}
						onDropWidgetKey={handleAddWidgetByKey}
						onMoveWidget={handleMoveWidget}
						onResizeWidget={handleResizeWidget}
					/>
					<PropertiesPanel selected={selectedWidget} onUpdate={handleUpdateWidget} />
				</div>
				{toast && <div className="toast">{toast}</div>}
			</div>
		</PortalProvider>
	);
}
