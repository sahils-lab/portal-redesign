import { useEffect } from "react";
import type { WhatIfWidgetConfig } from "../../../types/widget";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";

/**
 * Power BI-style What-if parameter: a slider whose current value is
 * published to PortalContext under `config.parameterId` so any Chart/Table
 * widget on the page can opt into applying it (see ChartWidget/TableWidget's
 * "Apply what-if" toolbar control). Registers on mount, unregisters on
 * unmount/delete — no PortalPage-level wiring needed, the same
 * decoupled-by-key pattern crossFilter uses instead of a widget-id lookup.
 */
export function WhatIfWidget({ config }: { config: WhatIfWidgetConfig }) {
	const { whatIfParams, registerWhatIf, setWhatIfValue, unregisterWhatIf } = usePortalContext();
	const { parameterId } = config;

	useEffect(() => {
		registerWhatIf(parameterId, { label: config.label, value: config.defaultValue, unit: config.unit });
		return () => unregisterWhatIf(parameterId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [parameterId]);

	const current = whatIfParams[parameterId];
	const value = current?.value ?? config.defaultValue;
	const displayValue = config.unit === "percent" ? `${value > 0 ? "+" : ""}${value}%` : String(value);

	return (
		<WidgetCard
			title={config.title}
			tooltip={[
				{ label: "Parameter", value: config.label },
				{ label: "Range", value: `${config.min} to ${config.max} (step ${config.step})` },
				{ label: "Applied by", value: "Widgets with “Apply what-if” set to this parameter" },
			]}
		>
			<div className="whatif-widget">
				<div className="whatif-widget__row">
					<span className="whatif-widget__label">{config.label}</span>
					<span className="whatif-widget__value">{displayValue}</span>
				</div>
				<input
					type="range"
					className="whatif-widget__slider"
					min={config.min}
					max={config.max}
					step={config.step}
					value={value}
					aria-label={config.label}
					onChange={(e) => setWhatIfValue(parameterId, Number(e.target.value))}
				/>
				<div className="whatif-widget__bounds">
					<span>{config.min}</span>
					<span>{config.max}</span>
				</div>
			</div>
		</WidgetCard>
	);
}
