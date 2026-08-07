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
- Smart alignment guides while dragging (snap lines against other widgets)
- Presentation / fullscreen mode
- Device-width preview (Desktop / Tablet / Mobile)
- Autosave with a live "Saving… / All changes saved" status indicator

**Additional dashboard behavior**
- Cross-widget filtering (click a region row, every related widget reacts)
- Filter shelf showing the active cross-filter as a dismissible chip
- Per-widget CSV export
- Hover tooltips on data widgets (source, dimensions, live-vs-published)
- Widget resizing via a drag handle, alongside move

**Interactivity batch: filtering, drill-down/through, bookmarks**
- Multi-dimension cross-filtering — click a bar/row on ANY chart, KPI, or
  table and every other widget reacts, across as many dimensions at once
  as you click (was one hardcoded region↔KPI pair before)
- Drill down/up on ChartWidget — Year → Quarter → Month → Week → Day, and
  Category → Subcategory → Product, with a breadcrumb back up
- Drill-through pages — a "view details" action on seller/warehouse/
  product/customer/region rows opens a dedicated detail mini-dashboard for
  that one entity
- Global sync filters — Date range / Region / Business Unit / Warehouse /
  Category / Brand / Seller apply across every page, persisted, with
  Warehouse cascading off Region
- Rich, searchable multi-select filter dropdowns with a removable-chip row
  and one-click reset
- Dynamic field switching — swap a chart's measure and dimension, or a
  table's group-by, from dropdowns, no dashboard edit needed
- Interactive KPI cards — sparkline, target-vs-actual status color
  (conditional formatting), click-to-drill into a region breakdown
- Bookmarks — save the current filters + cross-filters + page + live/
  published mode as a named view, restore it in one click
- A real ~3,600-row mock sales fact table + query engine
  (`utils/analytics.ts`) backing all of the above, instead of the earlier
  two-region toy dataset

**Power BI-parity batch: waterfall, matrix, top N, what-if parameter**
- Waterfall chart — new widget type, shows each bucket's contribution
  stacked into a running total ending in a "Total" bar (revenue/profit
  bridge), colored by whether that bucket added or subtracted
- Matrix widget — new widget type, a real cross-tab pivot (row dimension x
  column dimension) with row/column subtotals and a grand total, not just a
  ranked single-dimension table
- Visual-level Top N filter — Chart/Table widgets got a per-widget 5/10/15/
  20/All control, replacing a hardcoded 8/12-row limit with no user control
- What-if parameter — new widget type, a slider (e.g. "Revenue growth
  ±20%") that any Chart widget can opt into applying as a live multiplier,
  via a page-wide registry keyed by parameter id (not widget id)

**Polish**
- Skeleton loading states instead of "Loading…" text
- Multi-select, keyboard delete, duplicate widget, right-click context menu
- Drag ghost preview snapped to the grid cell it'll land in
- Collapsible Stencil/Properties panels

**Bug fix: collision-aware placement**
- Adding a widget could land it directly on top of an existing one, and
  resizing could grow a widget straight through its neighbor — the ghost
  preview shown while dragging was cosmetic and disconnected from where the
  widget actually landed. Fixed: drop position and resize growth are now
  collision-checked against other widgets, a blocked cell shows red with a
  ✕ and the browser's native "not-allowed" cursor, and the drop is rejected
  rather than silently placed somewhere else.

## Removed / fixed — wasn't useful as it was

- **Decorative buttons that did nothing** — Save, Publish, Preview, Undo,
  Redo, Present, zoom +/-, device dropdown, Page dropdown, and Add Page all
  existed in the UI from the start but had no handler. Removed the fake
  affordance, replaced with real behavior for every one.
- **Broken drag tracking** — the original approach read the dragged
  widget's id via `dataTransfer.getData()` during `dragover`, which the
  HTML5 spec makes unreadable at that point in every browser (silently
  returns empty). Removed in favor of tracking the id in local state.
- **CSS Grid layout that broke when a panel was hidden** — the 3-column
  grid unmounted a whole child when Stencil/Properties was toggled off,
  which threw off track assignment and crushed the canvas. Removed the
  unmount-based hide; panels now stay mounted and collapse their own width.
- **Plain-text loading state** — "Loading…" caused a layout jump when real
  content swapped in. Removed for shape-matched skeleton bars.
