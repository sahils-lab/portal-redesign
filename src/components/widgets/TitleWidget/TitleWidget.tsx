import type { TitleWidgetConfig } from "../../../types/widget";

/** Pure display widget — no data fetch, renders straight from config. */
export function TitleWidget({ config }: { config: TitleWidgetConfig }) {
	const Tag = config.level;
	return (
		<div className="title-widget">
			<Tag className="title-widget__text">{config.text}</Tag>
		</div>
	);
}
