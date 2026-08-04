import type { InfoWidgetConfig } from "../../../types/widget";

export function InfoWidget({ config }: { config: InfoWidgetConfig }) {
	return <div className={`info-widget info-widget--${config.severity}`}>{config.message}</div>;
}
