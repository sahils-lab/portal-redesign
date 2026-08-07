import type { WidgetConfig, AlertSeverity, InfoSeverity } from "../../types/widget";

type WidgetPatch = Partial<WidgetConfig>;

const infoSeverities: InfoSeverity[] = ["info", "success", "warning"];
const alertSeverities: AlertSeverity[] = ["info", "success", "warning", "danger"];

/**
 * Field set shown depends on widget type — data widgets (KPI/Metric/Report/
 * Recon) only expose the card Label; Display widgets expose whatever their
 * config actually renders (text/message/severity), since editing "Label"
 * there wouldn't change anything visible.
 */
export function PropertiesPanel({
	open,
	selected,
	onUpdate,
}: {
	open: boolean;
	selected: WidgetConfig | null;
	onUpdate: (id: string, patch: WidgetPatch) => void;
}) {
	return (
		<aside className={open ? "properties-panel" : "properties-panel properties-panel--collapsed"}>
			<div className="properties-panel__header">Properties</div>
			<div className="properties-panel__scroll">
				{!selected && <p className="properties-panel__empty">Select a widget to edit its properties.</p>}

				{selected &&
					(selected.type === "kpi" ||
						selected.type === "metric" ||
						selected.type === "report" ||
						selected.type === "recon" ||
						selected.type === "chart" ||
						selected.type === "table" ||
						selected.type === "waterfall" ||
						selected.type === "matrix") && (
						<div className="properties-field">
							<label htmlFor="widget-label">Label</label>
							<input
								id="widget-label"
								type="text"
								value={selected.title}
								placeholder="Enter Label"
								onChange={(e) => onUpdate(selected.id, { title: e.target.value })}
							/>
							{(selected.type === "chart" ||
								selected.type === "table" ||
								selected.type === "waterfall" ||
								selected.type === "matrix") && (
								<p className="properties-panel__empty">Measure/dimension are set from the widget's own toolbar.</p>
							)}
						</div>
					)}

				{selected && selected.type === "whatif" && (
					<>
						<div className="properties-field">
							<label htmlFor="widget-label">Label</label>
							<input
								id="widget-label"
								type="text"
								value={selected.label}
								onChange={(e) => onUpdate(selected.id, { label: e.target.value })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-whatif-min">Min</label>
							<input
								id="widget-whatif-min"
								type="number"
								value={selected.min}
								onChange={(e) => onUpdate(selected.id, { min: Number(e.target.value) })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-whatif-max">Max</label>
							<input
								id="widget-whatif-max"
								type="number"
								value={selected.max}
								onChange={(e) => onUpdate(selected.id, { max: Number(e.target.value) })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-whatif-step">Step</label>
							<input
								id="widget-whatif-step"
								type="number"
								value={selected.step}
								onChange={(e) => onUpdate(selected.id, { step: Number(e.target.value) })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-whatif-default">Default value</label>
							<input
								id="widget-whatif-default"
								type="number"
								value={selected.defaultValue}
								onChange={(e) => onUpdate(selected.id, { defaultValue: Number(e.target.value) })}
							/>
						</div>
						<p className="properties-panel__empty">
							Chart/Table widgets with a percent parameter can apply it from their own toolbar.
						</p>
					</>
				)}

				{selected && selected.type === "title" && (
					<>
						<div className="properties-field">
							<label htmlFor="widget-text">Text</label>
							<input
								id="widget-text"
								type="text"
								value={selected.text}
								onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-level">Heading level</label>
							<select
								id="widget-level"
								value={selected.level}
								onChange={(e) => onUpdate(selected.id, { level: e.target.value as typeof selected.level })}
							>
								<option value="h1">H1</option>
								<option value="h2">H2</option>
								<option value="h3">H3</option>
							</select>
						</div>
					</>
				)}

				{selected && selected.type === "label" && (
					<div className="properties-field">
						<label htmlFor="widget-text">Text</label>
						<input
							id="widget-text"
							type="text"
							value={selected.text}
							onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
						/>
					</div>
				)}

				{selected && selected.type === "divider" && (
					<p className="properties-panel__empty">Divider has no properties to configure.</p>
				)}

				{selected && selected.type === "info" && (
					<>
						<div className="properties-field">
							<label htmlFor="widget-message">Message</label>
							<input
								id="widget-message"
								type="text"
								value={selected.message}
								onChange={(e) => onUpdate(selected.id, { message: e.target.value })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-severity">Severity</label>
							<select
								id="widget-severity"
								value={selected.severity}
								onChange={(e) => onUpdate(selected.id, { severity: e.target.value as InfoSeverity })}
							>
								{infoSeverities.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
					</>
				)}

				{selected && selected.type === "alert" && (
					<>
						<div className="properties-field">
							<label htmlFor="widget-message">Message</label>
							<input
								id="widget-message"
								type="text"
								value={selected.message}
								onChange={(e) => onUpdate(selected.id, { message: e.target.value })}
							/>
						</div>
						<div className="properties-field">
							<label htmlFor="widget-severity">Severity</label>
							<select
								id="widget-severity"
								value={selected.severity}
								onChange={(e) => onUpdate(selected.id, { severity: e.target.value as AlertSeverity })}
							>
								{alertSeverities.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
					</>
				)}
			</div>
		</aside>
	);
}
