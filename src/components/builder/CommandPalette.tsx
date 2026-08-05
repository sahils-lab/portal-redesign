import { useEffect, useState } from "react";

export interface Command {
	id: string;
	label: string;
	group: string;
	action: () => void;
}

/**
 * Cmd/Ctrl+K quick-action palette — search-to-run for everything from adding
 * a widget to Save/Publish/Undo, instead of hunting through the stencil or
 * toolbar. Arrow keys navigate, Enter runs the highlighted command, Escape
 * (or a click outside) closes it.
 */
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);

	const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	const runCommand = (cmd: Command) => {
		cmd.action();
		onClose();
	};

	return (
		<div className="command-palette-overlay" onClick={onClose}>
			<div className="command-palette" onClick={(e) => e.stopPropagation()}>
				<input
					autoFocus
					className="command-palette__input"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Type a command or search…"
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault();
							setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
						} else if (e.key === "ArrowUp") {
							e.preventDefault();
							setActiveIndex((i) => Math.max(i - 1, 0));
						} else if (e.key === "Enter") {
							e.preventDefault();
							if (filtered[activeIndex]) runCommand(filtered[activeIndex]);
						} else if (e.key === "Escape") {
							onClose();
						}
					}}
				/>
				<div className="command-palette__list">
					{filtered.length === 0 && <div className="command-palette__empty">No matching commands</div>}
					{filtered.map((cmd, i) => (
						<button
							key={cmd.id}
							type="button"
							className={
								i === activeIndex ? "command-palette__item command-palette__item--active" : "command-palette__item"
							}
							onMouseEnter={() => setActiveIndex(i)}
							onClick={() => runCommand(cmd)}
						>
							<span className="command-palette__item-group">{cmd.group}</span>
							<span>{cmd.label}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
