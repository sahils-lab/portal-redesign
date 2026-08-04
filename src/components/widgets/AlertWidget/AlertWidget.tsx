import type { AlertWidgetConfig } from "../../../types/widget";
import { Icon } from "../../icons/Icon";

export function AlertWidget({ config }: { config: AlertWidgetConfig }) {
	return (
		<div className={`alert-widget alert-widget--${config.severity}`}>
			<Icon name="alert" size={16} />
			<span>{config.message}</span>
		</div>
	);
}
