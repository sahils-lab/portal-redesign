# Portal Redesign — Work Summary

Plain pointer summary of everything done in this prototype: what was added
that's actually useful, and what was removed/fixed because it wasn't. See
`design-doc.md` for the full write-up and reasoning behind each item.

## Added — useful

**Architecture fixes (the actual point of the prototype)**
- One widget data model (`WidgetConfig` discriminated union) instead of two
  parallel systems
- One hook (`useWidgetData`) for "fetch live or published data" — was
  copy-pasted and drifting across 4+ files in the real codebase
- Recon widget brought onto the same `WidgetCard` + `useWidgetData` pattern
  as KPI/Metric/Report, instead of being a one-off monolithic component
- Fully typed widgets end-to-end (discriminated unions, exhaustive
  `WidgetRenderer` switch) instead of `any`

**Real, working builder functionality**
- Save / Publish / Preview, backed by an actual draft-vs-published
  localStorage split (not decorative buttons)
- Undo / Redo with real command history (Cmd/Ctrl+Z, Shift+Z)
- Multi-page dashboards — switch / add / rename / delete pages, each with
  its own widgets and its own publish/preview snapshot
- Command palette (Cmd/Ctrl+K) for every widget type and action
- Functional zoom, with drag/resize math that stays correct at any zoom
  level
- Smart alignment guides while dragging (Figma/Tableau-style snap lines)
- Presentation / fullscreen mode
- Device-width preview (Desktop / Tablet / Mobile)
- Dark mode, with a real elevation system (cards visibly raised above the
  canvas, not just an inverted color scheme)
- Autosave with a live "Saving… / All changes saved" status indicator

**Tableau-inspired dashboard behavior**
- Cross-widget filtering (click a region row, every related widget reacts)
- Filter shelf showing the active cross-filter as a dismissible chip
- Per-widget CSV export
- Hover tooltips on data widgets (source, dimensions, live-vs-published)
- Widget resizing via a drag handle, alongside move

**Polish**
- Skeleton loading states instead of "Loading…" text
- Multi-select, keyboard delete, duplicate widget, right-click context menu
- Drag ghost preview snapped to the grid cell it'll land in
- Collapsible Stencil/Properties panels

## Removed / fixed — wasn't useful as it was

- **Decorative buttons that did nothing** — Save, Publish, Preview, Undo,
  Redo, Present, zoom +/-, theme toggle, device dropdown, Page dropdown,
  and Add Page all existed in the UI from the start but had no handler.
  Removed the fake affordance, replaced with real behavior for every one.
- **Broken drag tracking** — the original approach read the dragged
  widget's id via `dataTransfer.getData()` during `dragover`, which the
  HTML5 spec makes unreadable at that point in every browser (silently
  returns empty). Removed in favor of tracking the id in local state.
- **CSS Grid layout that broke when a panel was hidden** — the 3-column
  grid unmounted a whole child when Stencil/Properties was toggled off,
  which threw off track assignment and crushed the canvas. Removed the
  unmount-based hide; panels now stay mounted and collapse their own width.
- **Inverted dark-mode elevation** — the first dark theme pass gave widget
  cards a *darker* background than the canvas around them, so cards read
  as sunken holes instead of raised surfaces, and the light-mode shadow
  that normally separates them is invisible on a dark background. Removed
  the flat single-surface-color approach for a proper raised/base split.
- **Plain-text loading state** — "Loading…" caused a layout jump when real
  content swapped in. Removed for shape-matched skeleton bars.
