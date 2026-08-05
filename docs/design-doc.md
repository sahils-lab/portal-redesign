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
- Cross-filtering only understands one dimension (`region`) across two
  widget types (Metric → KPI) — enough to demonstrate the concept safely,
  not a general filter system

## Architecture overview

```
App
 └─ PortalProvider (holds dataMode: "live" | "published", crossFilter)
     └─ PortalPage (pages[] + activePageId; ONE useWidgetHistory instance
                     reused across pages via history.replace() on switch;
                     save/publish/preview state, now per-page)
         ├─ BuilderHeader → PageMenu (switch / add / rename / delete)
         └─ PortalCanvas (renders grid, live/published toggle, filter shelf)
             └─ WidgetRenderer (exhaustive switch on widget.type)
                 ├─ KPIWidget / MetricWidget / ReportWidget / ReconWidget
                 │    (share WidgetCard shell + useWidgetData hook)
                 └─ TitleWidget / LabelWidget / DividerWidget / InfoWidget / AlertWidget
                      (render straight from config, no data fetch)

useWidgetData(type, entityId)
 └─ reads dataMode from PortalContext
 └─ calls widgetFetchers[type](entityId, dataMode)
 └─ returns { status, data, error, source, retry }

PortalPage is moved OUT from under its own PortalProvider (it used to wrap
itself) specifically so it can call usePortalContext() directly — needed to
force dataMode to "published" while in Preview.
```

## Open questions / next steps

- [ ] Model the "Refresh Configuration" flow (pain point #5) — needs a
      second data source (e.g. a "source dataset" separate from "widget
      config") to demonstrate the correct merge order
- [ ] Decide on a real layout library — current drag-to-move/resize is
      hand-rolled pointer math, fine for a prototype but not collision-aware
      (widgets can be dropped/resized on top of each other)
- [ ] Add tests (none exist yet — the real codebase has thin test coverage
      in this area too, worth not repeating that)
