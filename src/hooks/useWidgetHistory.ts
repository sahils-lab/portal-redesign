import { useCallback, useReducer } from "react";
import type { WidgetConfig } from "../types/widget";

interface HistoryState {
	past: WidgetConfig[][];
	present: WidgetConfig[];
	future: WidgetConfig[][];
}

type HistoryAction =
	| { type: "set"; widgets: WidgetConfig[] }
	| { type: "replace"; widgets: WidgetConfig[] }
	| { type: "undo" }
	| { type: "redo" };

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
	switch (action.type) {
		case "set":
			return { past: [...state.past, state.present], present: action.widgets, future: [] };
		case "replace":
			// Loading a persisted draft on mount isn't something the user should be able to "undo" back out of.
			return { past: [], present: action.widgets, future: [] };
		case "undo": {
			if (state.past.length === 0) return state;
			const previous = state.past[state.past.length - 1];
			return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
		}
		case "redo": {
			if (state.future.length === 0) return state;
			const [next, ...rest] = state.future;
			return { past: [...state.past, state.present], present: next, future: rest };
		}
		default:
			return state;
	}
}

/**
 * Undo/redo history for the widget list — real command history, not the
 * decorative disabled icons the header started with. Every widget mutation
 * (add/delete/duplicate/move/resize/property edit) goes through `set`, which
 * pushes a history entry and clears any redo branch (standard undo-stack
 * semantics — making a new edit after undoing discards the old future).
 */
export function useWidgetHistory(initial: WidgetConfig[]) {
	const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] });

	const set = useCallback((widgets: WidgetConfig[]) => dispatch({ type: "set", widgets }), []);
	const replace = useCallback((widgets: WidgetConfig[]) => dispatch({ type: "replace", widgets }), []);
	const undo = useCallback(() => dispatch({ type: "undo" }), []);
	const redo = useCallback(() => dispatch({ type: "redo" }), []);

	return {
		widgets: state.present,
		set,
		replace,
		undo,
		redo,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
	};
}
