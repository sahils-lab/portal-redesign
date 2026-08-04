import type { LabelWidgetConfig } from "../../../types/widget";

export function LabelWidget({ config }: { config: LabelWidgetConfig }) {
	return (
		<div className="label-widget">
			<span className="label-widget__text">{config.text}</span>
		</div>
	);
}
