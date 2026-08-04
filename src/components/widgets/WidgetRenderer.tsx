import type { WidgetConfig } from "../../types/widget";
import { KPIWidget } from "./KPIWidget/KPIWidget";
import { MetricWidget } from "./MetricWidget/MetricWidget";
import { ReportWidget } from "./ReportWidget/ReportWidget";
import { ReconWidget } from "./ReconWidget/ReconWidget";
import { TitleWidget } from "./TitleWidget/TitleWidget";
import { LabelWidget } from "./LabelWidget/LabelWidget";
import { DividerWidget } from "./DividerWidget/DividerWidget";
import { InfoWidget } from "./InfoWidget/InfoWidget";
import { AlertWidget } from "./AlertWidget/AlertWidget";

/**
 * Single dispatch point from widget config -> component. Adding a new widget
 * type means adding one case here — TypeScript's exhaustiveness check
 * (the `never` in default) fails the build if a case is missed, instead of
 * silently rendering nothing the way an untyped if/else chain would.
 *
 * "Display" category widgets (title/label/divider/info/alert) render bare,
 * without the WidgetCard shell the data widgets use — that matches the real
 * Portal, where these are inline layout elements, not data cards.
 */
export function WidgetRenderer({ config }: { config: WidgetConfig }) {
	switch (config.type) {
		case "kpi":
			return <KPIWidget config={config} />;
		case "metric":
			return <MetricWidget config={config} />;
		case "report":
			return <ReportWidget config={config} />;
		case "recon":
			return <ReconWidget config={config} />;
		case "title":
			return <TitleWidget config={config} />;
		case "label":
			return <LabelWidget config={config} />;
		case "divider":
			return <DividerWidget />;
		case "info":
			return <InfoWidget config={config} />;
		case "alert":
			return <AlertWidget config={config} />;
		default: {
			const _exhaustive: never = config;
			return _exhaustive;
		}
	}
}
