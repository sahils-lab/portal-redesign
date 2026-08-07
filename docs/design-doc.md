# Portal Redesign — Design Doc

## Purpose

A standalone prototype exploring how the Portal feature's architecture could
be consolidated, based on a pain-points audit of the real Portal codebase.
This is not a port of the real implementation — it's original code, built to
demonstrate the same fixes at a smaller scale.

## Pain points this addresses

| # | Pain point found in the real codebase | How this prototype addresses it |
|---|---|---|
| 1 | Two parallel widget systems (legacy Dashboard vs current Portal), two grid libraries | Single system, single widget model (`WidgetConfig` union in `types/widget.ts`) |
| 2 | Recon widget structurally inconsistent (no Container/Modal split like the others) | All four widget types go through the same `WidgetCard` shell + `useWidgetData` hook — no exceptions |
| 4 | "Live vs published" data routing reimplemented independently across 4+ files, and the copies drifted | One hook, `useWidgetData`, is the only place that decision is made — see `src/hooks/useWidgetData.ts` |
| 4 (cont.) | Duplicated routing logic between container and service layer | `widgetFetchers` in `src/api/widgetApi.ts` is the single dispatch table from widget type → fetch function |
| 5 | Refresh-config merge bugs (old config silently overriding fresh data) | Not yet modeled in this prototype — flagged as a TODO below, since it needs an actual "refresh from source" flow to demonstrate properly |
| 9 | Heavy `any` usage, especially at the live/published boundary | Every type in `types/widget.ts` is a proper discriminated union; `WidgetRenderer`'s switch is exhaustive (TS `never` check) so a missing case is a compile error, not a silent bug |

## Features beyond the pain-points fix

Several dashboard capabilities were added on top of the pain-points fixes
above — not present in the real Portal, and not required to demonstrate the
architecture, but they make the case for *why* the consolidated architecture
matters (a shared cross-filter concept is only safe to build because the
live/published and widget-identity confusion from pain points #4 and #6
were fixed first):

- **Cross-widget filtering** — click a region row in `MetricWidget`, every
  widget that understands the `region` dimension reacts (`KPIWidget` narrows
  to that region's value). Implemented via `PortalContext`'s `crossFilter`,
  keyed on `{ dimension, value }` rather than a widget id — deliberately
  avoiding the real codebase's documented bug
  (`portal-widget-filter-column-identity-mismatch.md`) where widget-ID space
  and worksheet-ID space got conflated.
- **Filter shelf** — the active cross-filter shows as a dismissible chip in
  the canvas toolbar, not just on whichever widget happens to be reacting to
  it — makes an active filter discoverable even if you didn't set it
  yourself.
- **Widget resizing** — drag the bottom-right corner handle to resize a
  widget on the grid, alongside the existing drag-to-move. Pointer-event
  based, separate from the stencil/move DnD flow (HTML5 drag-and-drop isn't
  well suited to a sub-element resize gesture).
- **CSV export per widget** — hover a data widget (KPI/Metric/Report/Recon)
  for a download icon; exports that widget's current data (respecting the
  live/published toggle and any active cross-filter) as a `.csv` — no
  server round-trip, just a client-side `Blob` download.
- **Presentation/fullscreen mode** — a "Present" button hides the Stencil/
  Properties panels and builder chrome, requests browser fullscreen, and
  disables editing affordances (resize handle, duplicate/delete, export
  icons) via a single `.portal-builder--presentation` modifier class rather
  than threading an `editable` prop through every widget. Escape (or the
  floating exit pill) leaves presentation mode; also stays in sync if the
  user exits fullscreen via the browser's own UI.

## Real workflow: Undo/Redo, Save, Publish, Preview

The header always had Save/Publish/Preview/Undo/Redo buttons — they were
decorative until this pass. This is the feature set that actually completes
the live/published story the rest of the prototype has been telling:

- **Undo/Redo** — real command history (`useWidgetHistory`, a classic
  past/present/future reducer), not the two disabled icons the header
  started with. Every widget mutation (add/delete/duplicate/move/resize/
  property edit) is a history entry. Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (or
  Ctrl+Y) work as shortcuts, and the toolbar buttons disable themselves
  correctly at either end of the stack.
- **Save** — persists the current draft to `localStorage` so a page refresh
  doesn't lose your work. Previously nothing persisted at all.
- **Publish** — takes an explicit, independent **snapshot** of the current
  draft (`JSON.parse(JSON.stringify(widgets))`, not a reference) and
  persists it separately from the draft. This is the concrete, working
  version of the exact bug documented in the real codebase
  (`portal-published-snapshot-stale-hide-unshared-pages-flag.md`, where a
  flag was accidentally read from a stale snapshot) — here the draft/
  published split is explicit and intentional: editing after publishing
  does **not** silently change what's published, on purpose, and there's a
  banner making that state visible rather than a silent trap.
- **Preview** — renders the *published* snapshot, not the live draft,
  read-only (edits, resize, drag, delete, and the right-click menu are all
  actually disabled via a `readOnly` prop threaded through `PortalCanvas`,
  not just hidden with CSS). Also forces the Live/Published data toggle to
  "published" for the duration, restoring whatever it was set to on exit.
  Clicking Preview before ever publishing shows a toast instead of a blank
  or broken view.

Together these make Save/Publish/Preview mean something concrete instead of
being three buttons that all did nothing — which is the detail most likely
to stand out in a walkthrough, since it's the one part of the header a
reviewer would actually try clicking.

## More editor polish: command palette, real zoom, alignment guides

- **Command palette (Cmd/Ctrl+K)** — searchable quick-actions list covering
  every wired-up widget type ("Add KPI", "Add Alert", …) plus Undo/Redo/
  Save/Publish/Preview/Present/panel toggles/zoom, in one place instead of
  hunting through the stencil or toolbar. Works even while focus is in a
  text field (matching the usual convention for this shortcut) — every
  *other* shortcut in this app deliberately doesn't, to avoid hijacking
  normal typing.
- **Functional zoom** — the +/- buttons in the toolbar were decorative
  before; they now actually scale the canvas (`transform: scale()`) with a
  live percentage readout. The trickier part: drag-move, resize, and the
  new alignment guides all do pixel math against `getBoundingClientRect()`,
  which already reflects the CSS scale — so the geometry stays accurate at
  any zoom level as long as the *unscaled* constants (`GRID_GAP_PX`,
  `ROW_HEIGHT_PX`) are explicitly multiplied by the current zoom wherever
  they're mixed into that math. Getting this wrong is a classic zoom-bug
  source; it's called out explicitly in `PortalCanvas.tsx` rather than left
  as an implicit assumption.
- **Smart alignment guides** — pink snap lines while dragging an existing
  widget: if the widget being dragged would land with
  an edge aligned to another widget's edge, a guide line renders at that
  boundary. Computed in grid-unit space (column/row indices), not pixels —
  both sides of the comparison already came from the same `colWidth` math,
  so there's no unit-conversion drift to get subtly wrong.
  - One correctness note worth knowing: HTML5 drag-and-drop's
    `dataTransfer.getData()` is only readable on `drop` (and `dragstart`) —
    every browser withholds the actual value during `dragover`, only
    `.types` is exposed. The first draft of this used `getData()` inside
    `dragover` to figure out which widget was being moved (for ghost sizing
    and alignment), which silently returns an empty string everywhere, not
    just in "some browsers." Fixed by tracking the dragged widget's id in
    local component state (set on `dragstart`), read during `dragover`
    instead of relying on `getData()` too early in the drag lifecycle.

## Auto-save and device preview

- **Auto-save with a live status indicator** — every draft edit shows
  "Unsaved changes" immediately, then debounces (1.2s of inactivity) into
  an actual `localStorage` write and flips to "All changes saved" — the
  manual Save button still exists for an explicit, immediate write. Small
  detail, but it's the kind of thing that makes a prototype feel like a
  real product instead of a demo you have to remember to save.
- **Device-width preview** — the "Responsive" dropdown was decorative
  before (same gap pattern as the old zoom buttons); it's now a real
  Desktop/Tablet(768px)/Mobile(390px) selector that constrains the canvas
  to that viewport width in a bordered device frame. Documented honestly in
  `components/builder/deviceModes.ts`: this is a width **preview**, not a
  true responsive reflow — widget positions are still a fixed 8-column
  grid, so this shows what would get clipped/scrolled at a given width
  rather than actually re-flowing the layout. That's the same limitation
  the real Portal has; the value here is making the limitation visible
  during design instead of only discovering it on an actual phone.

## Multi-page dashboards and widget hover tooltips

Two more features, both closing gaps between "looks like a real builder" and
"is one":

- **Multi-page dashboards** — the "Page ▾" dropdown and "Add page" button in
  the toolbar were pure decoration (static, no click handler) for the entire
  rest of this prototype; this is the multi-page organizing concept made
  real. `PageMenu.tsx` is a self-contained dropdown
  (switch / inline rename / add / delete, guarded so the last page can't be
  deleted) driven entirely by props — `PortalPage` owns the actual `pages`
  state (`{ id, name, widgets }[]`) and `activePageId`.
  - Deliberately **one `useWidgetHistory` instance, reused across pages**,
    not one stack per page. Switching pages calls `history.replace(target
    .widgets)` — a non-undoable load, same primitive already used for
    hydrating a persisted draft on mount — rather than swapping in a
    different history object. The accepted tradeoff: undo/redo history
    resets on page switch. Keeping N independent undo stacks alive
    indefinitely (including for pages you're not looking at) is real
    complexity for a benefit a demo doesn't need; documenting the tradeoff
    here is cheaper than building it.
  - A `useEffect` keyed on `widgets` keeps `pages[activePageId].widgets` in
    sync with whatever the (single, shared) history is currently holding —
    the one place page data and live editor state reconcile.
  - **Publish/Preview are scoped per page**, not global: `publishedPages` is
    `Record<pageId, WidgetConfig[]>`, so publishing Page 2 doesn't touch
    Page 1's last-published snapshot, and Preview always reflects the
    snapshot for whichever page is currently active. `persistence.ts` was
    restructured to match — `draftStorage` now saves the whole `pages` array
    plus `activePageId`; `publishedStorage` saves the per-page snapshot map.
  - Command palette gained matching entries ("Add page", "Go to page: …")
    so pages are reachable without touching the dropdown at all — same
    "don't make people hunt through menus" reasoning as every other
    palette entry.
- **Hover tooltips on data widgets** — hovering a KPI/Metric/Report/Recon
  widget reveals a small info popover (widget-level metadata rather than
  per-data-point) showing
  the entity id/dataset, the type-specific dimensions (rows/columns for
  Metric, section count for Report, item count for Recon), and whether it's
  currently reading live or published data. Implemented as one addition to
  the shared `WidgetCard` shell (`tooltip?: { label; value }[]` prop,
  CSS-only show-on-hover/focus so there's no extra state or JS timer) — every
  widget type opts in by passing its own rows, so the popover content stays
  type-specific without four different tooltip implementations.

## Interactivity batch: cross-filtering, drill-down/through, global filters, bookmarks

A large batch, built in priority order: the features here all reinforce the
same underlying query engine, so they're one cohesive addition rather than
nine unrelated ones. A second batch (Smart Insights, Key Influencers,
Decomposition Tree, Natural Language Query) is intentionally **not** in this
pass — see "What this prototype is NOT" below for why, and "Open questions"
for the plan.

**The data layer these all share** — `src/mocks/salesData.ts` generates a
~2-years, ~3,600-row order-line fact table (region → warehouse, category →
subcategory → product, brand, seller, customer, date) with a seeded PRNG so
the numbers are stable across reloads. `src/utils/analytics.ts` is the one
query engine every widget below goes through — `applyGlobalFilters`,
`applyCrossFilters`, `aggregateBy`, `aggregateByDateGrain`,
`aggregateTable` — the same "one source of truth" principle as
`useWidgetData`, just for this batch's data. Chart/Table widgets are a
third widget category (`DataWidgetType` is a `useWidgetData`/live-published
concept; Chart/Table read the fact table synchronously instead) — noted
explicitly in `types/widget.ts` rather than left to be discovered.

- **Cross-visual interactions** — clicking a bar, KPI breakdown row, or
  table row toggles a `{ dimension, value }` entry in `PortalContext`'s
  `crossFilters` **list** (not a single value anymore — see the type doc
  comment for the exact rule: same dimension replaces, different dimensions
  AND together, same value again clears). Every Chart/Table/KPI reacts,
  the same click-to-toggle idea the prototype already had for
  Metric → KPI, generalized to N widgets and N dimensions instead of one
  hardcoded pair.
- **Drill down/up** — ChartWidget supports two real hierarchies: the date
  hierarchy (Year → Quarter → Month → Week → Day) and the catalog hierarchy
  (Category → Subcategory → Product). Drill state is local component state,
  not persisted — resets on reload/page-switch, the same accepted tradeoff
  as multi-page's undo history, and for the same reason (keeping N
  hierarchy-position stacks alive forever is real complexity a prototype
  doesn't need). A breadcrumb ("All › Sports") drills back up to any level.
  Dimensions without a real hierarchy (region, seller, warehouse, brand,
  customer) just cross-filter on click instead of pretending to drill.
- **Drill-through pages** — clicking a table row's "view details" icon (for
  seller/warehouse/product/customer/region — the dimensions that resolve
  to one real entity) opens `DrillThroughPage`: headline stats, a revenue
  trend, and one relevant breakdown, computed fresh from the fact table
  filtered to that entity. Implemented as in-app navigation state
  (`drillThrough: {entityType, entityId} | null` in `PortalPage`), not a
  router — consistent with how multi-page navigation already works here,
  and avoids adding a routing dependency for one page type.
- **Global sync filters** — Date range / Region / Business Unit /
  Warehouse / Category / Brand / Seller, in `FilterContext`, persisted to
  localStorage, applied on every page (unlike the cross-filter, which is
  transient and per-page). Warehouse cascades off Region (the one real
  parent/child relationship in this dimension set) — picking a region
  narrows the warehouse list to the ones that actually belong to it.
- **Rich filtering** — `MultiSelectFilter` is one searchable,
  multi-select dropdown component reused for every dimension in the filter
  bar, with a chip row underneath showing every active filter (across
  global filters AND date range) with one-click remove, plus "Reset all".
- **Dynamic field switching** — ChartWidget's Measure and Dimension
  dropdowns re-query the fact table live; TableWidget's "Group by" dropdown
  does the same. No dashboard edit required, matching the ask directly.
- **Interactive KPI cards** — KPIWidget gained a sparkline (color-coded by
  direction), a target-vs-actual status badge (green/amber/red — see
  Conditional formatting below), and click-to-drill: clicking the value
  toggles an inline region breakdown (existing `byRegion` data, now
  surfaced instead of only backing the cross-filter).
- **Conditional formatting** — `utils/conditionalFormatting.ts` is a small,
  reusable rule (`value/target >= 100% → success, >= 80% → warning, else
  danger`) — same thresholds a Power BI KPI visual defaults to. Currently
  wired to KPIWidget's target badge; the module is generic enough to reuse
  for Chart/Table cells later without new plumbing.
- **Bookmarks** — `utils/bookmarks.ts` + `BookmarksMenu` capture "the view"
  (global filters, active cross-filters, active page, live/published mode)
  under a name, persisted to localStorage. Deliberately NOT the widgets
  themselves — a bookmark is a saved *lens* on the dashboard, not a saved
  copy of it, so editing widgets later doesn't silently break old
  bookmarks.

## UI/UX polish

Layered on after the architecture work, purely to make the builder feel
like a finished product rather than a functional-but-rough demo:

- **Collapsible Stencil/Properties panels** — "Hide Stencil" / "Hide
  Properties" links in the toolbar (matching the real product's own
  affordance), canvas expands to fill the freed space with a smooth
  transition.
- **Skeleton loading states** — shape-matched shimmer bars instead of plain
  "Loading…" text, so widgets don't visually jump when data arrives.
- **Enter animation** on newly added widgets, hover elevation on cards.
- **Multi-select** — shift/cmd-click to select multiple widgets, bulk-delete
  with Delete/Backspace.
- **Keyboard shortcuts** — Delete/Backspace removes the selection, Escape
  clears it (guarded against firing while typing in an input).
- **Duplicate widget** — hover a widget for a duplicate button, or
  right-click for a context menu (Duplicate/Delete).
- **Drag ghost preview** — dragging a new widget from the stencil shows a
  dashed preview snapped to the grid cell it'll land in, instead of only
  highlighting the whole canvas.
- **Toast entrance animation**, richer empty-canvas state with an icon.

## What this prototype is NOT

- Not a pixel-accurate recreation of Bluecopa's real Portal UI
- Not connected to any real backend — `src/api/widgetApi.ts` simulates
  network calls (latency + failure) against static mock data in
  `src/mocks/widgetData.ts`
- Doesn't include cross-env import/export or the AI widget builder — those
  are separate, larger concerns noted in the pain-points audit but out of
  scope for this architecture demo
- The "AI-powered" features from the interactivity batch's brief — Smart
  Insights, Key Influencers, Decomposition Tree, Natural Language Query —
  are deliberately out of THIS pass, not silently dropped. There's no
  backend/LLM in this prototype to call; doing them honestly means either
  real statistics computed from the mock fact table (variance/outlier
  detection, correlation) with a pattern-matching NL parser rather than an
  actual language model, or wiring up a real LLM call and accepting a
  backend dependency this prototype has deliberately avoided everywhere
  else. Flagged in "Open questions" rather than faked with canned copy.
- Drill-through pages resolve to an in-app navigation state, not real URLs
  — there's no router in this prototype (multi-page navigation works the
  same way). Refreshing mid-drill-through loses the page, same as
  refreshing mid-preview does today.

## Architecture overview

```
App
 └─ PortalProvider (dataMode, crossFilters[] — click-driven, per-page)
     └─ FilterProvider (GlobalFilters — persistent, every page)
         └─ PortalPage (pages[] + activePageId; ONE useWidgetHistory instance
                         reused across pages via history.replace() on switch;
                         save/publish/preview state, now per-page;
                         drillThrough: {entityType, entityId} | null)
             ├─ BuilderHeader → PageMenu / BookmarksMenu
             ├─ GlobalFilterBar → MultiSelectFilter (x6) + date range + chips
             ├─ drillThrough set? → DrillThroughPage (own mini-dashboard)
             └─ drillThrough null? → PortalCanvas (grid, live/published toggle,
                     filter shelf showing every active crossFilters[] entry)
                 └─ WidgetRenderer (exhaustive switch on widget.type)
                     ├─ KPIWidget / MetricWidget / ReportWidget / ReconWidget
                     │    (share WidgetCard shell + useWidgetData hook,
                     │     live/published mock data)
                     ├─ ChartWidget / TableWidget / WaterfallWidget / MatrixWidget
                     ├─ WhatIfWidget (publishes to PortalContext.whatIfParams,
                     │    read by ChartWidget's "Apply what-if" dropdown)
                     │    (share WidgetCard shell + utils/analytics.ts,
                     │     read salesRows synchronously — no live/published)
                     └─ TitleWidget / LabelWidget / DividerWidget / InfoWidget / AlertWidget
                          (render straight from config, no data fetch)

useWidgetData(type, entityId)               utils/analytics.ts
 └─ reads dataMode from PortalContext        └─ applyGlobalFilters / applyCrossFilters
 └─ calls widgetFetchers[type](...)          └─ aggregateBy / aggregateByDateGrain / aggregateTable
 └─ returns { status, data, error, source }  └─ shared by Chart/Table/DrillThroughPage

PortalPage is moved OUT from under its own PortalProvider (it used to wrap
itself) specifically so it can call usePortalContext() directly — needed to
force dataMode to "published" while in Preview.
```

## Power BI-parity batch: waterfall, matrix, top N, what-if parameter

Four more Power BI dashboard-design capabilities the prototype didn't have,
chosen deliberately to *not* overlap with the AI-flavored items already
deferred to Batch 2 below (Smart Insights, Key Influencers, Decomposition
Tree, NLQ):

- **Waterfall chart** (`WaterfallWidget`) — a new widget type, same
  measure/dimension toolbar pattern as `ChartWidget`, but instead of one bar
  per bucket it shows each bucket's own contribution stacked on a running
  total, ending in an explicit "Total" bar — Power BI's standard "how did
  the parts build up to the whole" shape. Colored by sign (green = positive
  contribution, red = negative), not by position, since `profit` can go
  negative per bucket even though most measures here are non-negative sums.
  Built as its own SVG (pixel-computed bar rects, same approach
  `ChartWidget`'s line-chart mode already uses) rather than reusing
  `ChartWidget`'s bar-list markup, because a waterfall bar floats between two
  y-values instead of starting at zero.
- **Matrix widget** (`MatrixWidget`) — a genuine cross-tab pivot: row
  dimension x column dimension, one measure per cell, with a row-subtotal
  column, a column-subtotal/Total row, and a grand total —
  `utils/analytics.ts`'s new `aggregateMatrix`. This is the thing a flat
  `TableWidget` structurally can't show (it only ever ranks one dimension).
  Deliberately **not** hierarchical/expandable — rows and columns are each
  capped to their top-N by total and rendered flat. A real Matrix visual
  lets you nest row groups and expand/collapse them; that's a materially
  bigger feature (multi-level row keys, collapse state per node) than "add
  subtotals to a table," and subtotals are the part that's actually load-
  bearing for a financial dashboard.
- **Visual-level Top N filter** — `ChartWidgetConfig.topN` /
  `TableWidgetConfig.topN`, surfaced as a toolbar dropdown (5/10/15/20/All)
  next to the existing measure/dimension switchers. This is the Power BI
  distinction between a dashboard-wide filter (this app's Global Filter Bar,
  from the previous batch) and a per-visual filter that only narrows one
  widget — previously the "how many bars/rows to show" limit was a hardcoded
  constant (8 for Chart, 12 for Table) with no user control at all.
- **What-if parameter** (`WhatIfWidget`) — a slider-driven scenario input
  (e.g. "Revenue growth −20% to +20%"). Its live value is published to
  `PortalContext.whatIfParams`, keyed by `parameterId` rather than widget id
  — deliberately the same decoupled-by-key pattern `crossFilter` already
  uses, for the same reason (no widget-identity lookup to get wrong). Any
  `ChartWidget` gets an "Apply what-if" toolbar dropdown listing every
  what-if parameter currently on the page; picking one multiplies the
  chart's values by `1 + value/100` client-side, so a viewer can ask "what
  would this look like if growth were +10%" without touching real data.
  Only parameters with `unit: "percent"` are selectable this way — a
  "number" unit is exposed for the widget's own display but isn't wired into
  a measure multiplier, since there's no unit-consistent way to apply an
  arbitrary number to every measure. `PortalContext` registers/unregisters
  params as `WhatIfWidget` instances mount/unmount, so deleting the widget
  cleanly removes the parameter from every other widget's dropdown; the
  duplicate-widget action gives a copied what-if widget a fresh
  `parameterId` rather than letting two sliders silently fight over one
  registry entry (the same bug shape as reusing an id space instead of a
  value — see the crossFilter note above).

## Bug fix: collision-aware placement (add / move / resize)

Reported: adding a widget (from the stencil, drag or click) could land it
directly on top of an existing widget with no warning, and dragging a
resize handle past a neighbor grew the widget straight through it —
`PortalCanvas` computed a ghost preview snapped to the cursor, but the
*actual* placement on drop always ignored it (`nextGridPosition` just
appended below everything, regardless of where you dropped), and resize had
no bound at all. Once two widgets were overlapping, there was no affordance
to tell them apart — the same drag/resize gestures used to fix it would
just as happily create more overlaps.

Fixed in `PortalCanvas.tsx`:
- **Add** — the drop cell shown by the ghost preview is now the cell the
  widget actually lands in (`onDropWidgetKey` gained an optional `at`
  param, threaded through `createWidgetFromStencil`), instead of two
  disconnected computations that only coincidentally looked related.
- **Collision check** — a shared `collides()` AABB test runs during
  `dragover` for both the stencil-add and move-existing flows. A blocked
  cell renders the ghost red with a ✕ (`canvas-cell__ghost--blocked`) and
  deliberately skips `preventDefault()` — per the HTML5 DnD spec that's what
  makes the browser show its own "not-allowed" cursor (the reddish no-entry
  glyph this was originally asked for) and stops `drop` from firing there at
  all, rather than a bespoke overlay trying to fake that cue.
- **Resize** — `maxNonCollidingSize()` clamps growth to the largest size
  that doesn't overlap a neighbor (width first, then height at the
  resulting width — good enough for a diagonal-handle drag without full
  rectangle-packing), so dragging the resize handle now stops at the
  neighbor's edge instead of resizing through it.
- Ghost sizing for a stencil item in particular needed knowing which item
  is mid-drag *during* `dragover`, which hit the same `dataTransfer.getData()`
  timing limit already documented above for canvas-internal moves (readable
  on `drop`/`dragstart` only). Fixed the same way: `StencilPanel` reports
  drag start/end up to `PortalPage`, which passes the dragged `StencilItem`
  back down to `PortalCanvas` as a prop, rather than guessing a fixed 2x2
  ghost size for every widget type regardless of its real footprint
  (`defaultWidgetSize()` in `createWidget.ts`, now the one place per-type
  default sizes live — previously duplicated as literals in each
  `createWidgetFromStencil` case).

## Open questions / next steps

- [ ] Model the "Refresh Configuration" flow (pain point #5) — needs a
      second data source (e.g. a "source dataset" separate from "widget
      config") to demonstrate the correct merge order
- [ ] Decide on a real layout library — current drag-to-move/resize is
      hand-rolled pointer math, fine for a prototype. It's now
      collision-aware (see "Collision-aware placement" below) but doesn't
      auto-reflow neighbors out of the way the way a packing layout engine
      would — a blocked cell just refuses the drop/resize instead.
- [ ] Add tests (none exist yet — the real codebase has thin test coverage
      in this area too, worth not repeating that)
- [ ] **Batch 2 (AI-flavored):** Smart Insights (rule-based deltas/outliers
      over the fact table, not an LLM), Key Influencers (correlation/
      variance-explained over `salesRows`, surfaced as ranked dimensions),
      Decomposition Tree (recursive drill using the same `aggregateBy` the
      ChartWidget already has), Natural Language Query (pattern-matching
      parser for phrasings like "top N X by Y this month" → builds a real
      ChartWidget/TableWidget config from the matched intent; honest
      "couldn't parse that" state for anything unmatched)
- [ ] **Matrix hierarchy:** row/column groups that nest and expand/collapse
      (e.g. Category → Subcategory rows), rather than today's flat top-N
      pivot — needs multi-level row keys and per-node collapse state.
- [ ] **Batch 3:** Advanced tooltips as mini-dashboards (extend the
      existing hover popover with a trend + related KPIs, not just static
      metadata rows), Personal dashboard views (per-user widget layout
      without a user system to scope it to — needs a decision on what
      "per-user" means in a prototype with no auth), a real performance
      pass now that the fact table is ~3,600 rows and every widget
      re-aggregates on every filter change (works fine today; memoization
      is already in place via `useMemo`, but virtualizing Chart/Table for
      much larger datasets is the next lever if this scales up)
