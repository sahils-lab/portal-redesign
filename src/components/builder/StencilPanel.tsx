import { stencilSections, type StencilItem } from "./stencilConfig";
import { Icon } from "../icons/Icon";

export function StencilPanel({ onAddWidget }: { onAddWidget: (item: StencilItem) => void }) {
	return (
		<aside className="stencil-panel">
			<div className="stencil-panel__header">Stencil</div>
			<div className="stencil-panel__scroll">
				{stencilSections.map((section) => (
					<div key={section.title} className="stencil-section">
						<div className="stencil-section__title">{section.title}</div>
						{section.items.map((item) => (
							<button
								type="button"
								key={item.key}
								className="stencil-item"
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData("application/x-stencil-item", item.key);
									e.dataTransfer.effectAllowed = "copy";
								}}
								onClick={() => onAddWidget(item)}
								title={item.widgetType ? `Add ${item.label}` : `${item.label} (not implemented in this prototype)`}
							>
								<span className="stencil-item__handle" aria-hidden="true">
									⠿
								</span>
								<Icon name={item.icon} className="stencil-item__icon" />
								<span className="stencil-item__label">{item.label}</span>
							</button>
						))}
					</div>
				))}
			</div>
		</aside>
	);
}
