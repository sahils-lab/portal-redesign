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

## Features beyond the pain-points fix (inspired by Tableau)

Since Tableau is the reference point for what a "good" dashboard builder
does, two of its defining capabilities were added on top of the pain-points
fixes above — not present in the real Portal, and not required to
demonstrate the architecture, but they make the case for *why* the
consolidated architecture matters (a shared cross-filter concept is only
safe to build because the live/published and widget-identity confusion from
pain points #4 and #6 were fixed first):

- **Cross-widget filtering** — click a region row in `MetricWidget`, every
  widget that understands the `region` dimension reacts (`KPIWidget` narrows
  to that region's value). Implemented via `PortalContext`'s `crossFilter`,
  keyed on `{ dimension, value }` rather than a widget id — deliberately
  avoiding the real codebase's documented bug
  (`portal-widget-filter-column-identity-mismatch.md`) where widget-ID space
  and worksheet-ID space got conflated.
- **Widget resizing** — drag the bottom-right corner handle to resize a
  widget on the grid, alongside the existing drag-to-move. Pointer-event
  based, separate from the stencil/move DnD flow (HTML5 drag-and-drop isn't
  well suited to a sub-element resize gesture).

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
PortalPage
 └─ PortalProvider (holds dataMode: "live" | "published")
     └─ PortalCanvas (renders grid, has the live/published toggle)
         └─ WidgetRenderer (exhaustive switch on widget.type)
             ├─ KPIWidget
             ├─ MetricWidget
             ├─ ReportWidget
             └─ ReconWidget
                  (all four use the same WidgetCard shell + useWidgetData hook)

useWidgetData(type, entityId)
 └─ reads dataMode from PortalContext
 └─ calls widgetFetchers[type](entityId, dataMode)
 └─ returns { status, data, error, source, retry }
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
