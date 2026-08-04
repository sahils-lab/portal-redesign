import { useState } from "react";
import { Icon } from "../icons/Icon";

export function BuilderHeader({
	title,
	onTitleChange,
	published,
}: {
	title: string;
	onTitleChange: (title: string) => void;
	published: boolean;
}) {
	const [editing, setEditing] = useState(false);

	return (
		<div className="builder-header">
			<div className="builder-header__row">
				<button type="button" className="icon-button" aria-label="Back">
					←
				</button>
				{editing ? (
					<input
						className="builder-header__title-input"
						value={title}
						autoFocus
						onChange={(e) => onTitleChange(e.target.value)}
						onBlur={() => setEditing(false)}
						onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
					/>
				) : (
					<button type="button" className="builder-header__title" onClick={() => setEditing(true)}>
						{title}
						<span className="builder-header__edit-icon">✎</span>
					</button>
				)}

				<div className="builder-header__spacer" />

				<span className={`status-badge ${published ? "status-badge--published" : "status-badge--draft"}`}>
					{published ? "Published" : "Not published"}
				</span>
				<button type="button" className="icon-button" aria-label="More options">
					⋮
				</button>
				<button type="button" className="btn btn--outline">
					Share
				</button>
				<button type="button" className="btn btn--outline-primary">
					Preview
				</button>
				<button type="button" className="btn btn--outline-primary">
					Version history
				</button>
				<button type="button" className="btn btn--outline-primary">
					Publish
				</button>
				<button type="button" className="btn btn--outline-primary">
					Save
				</button>
			</div>

			<div className="builder-header__row builder-header__row--toolbar">
				<button type="button" className="btn btn--primary btn--sm">
					Page <Icon name="chevron-down" size={14} />
				</button>
				<div className="builder-header__spacer" />
				<select className="select-sm" defaultValue="responsive">
					<option value="responsive">Responsive</option>
					<option value="fixed">Fixed</option>
				</select>
				<button type="button" className="icon-button" aria-label="Zoom in">
					⊕
				</button>
				<button type="button" className="icon-button" aria-label="Zoom out">
					⊖
				</button>
				<button type="button" className="icon-button" aria-label="Undo">
					↶
				</button>
				<button type="button" className="icon-button" aria-label="Redo" disabled>
					↷
				</button>
				<div className="builder-header__spacer" />
				<button type="button" className="btn btn--primary btn--sm">
					<Icon name="plus" size={14} /> Add page
				</button>
			</div>
		</div>
	);
}
