# Portal Redesign — Prototype

A standalone React + TypeScript prototype exploring an architectural
consolidation of Bluecopa's "Portal" feature (BI dashboards with
KPI/Metric/Report/Recon widgets), based on a pain-points audit of the real
codebase.

See [`docs/design-doc.md`](docs/design-doc.md) for the full writeup —
what problems this addresses, what it deliberately leaves out, and the
architecture overview.

## Run it

```bash
npm install
npm run dev
```

Toggle "Live (draft)" vs "Published" in the toolbar to see the same widgets
render different mock data — that's the behavior the redesign's unified
`useWidgetData` hook (`src/hooks/useWidgetData.ts`) is built around.

## Stack

- Vite + React + TypeScript
- No backend — `src/api/widgetApi.ts` simulates network calls against static
  mock data in `src/mocks/widgetData.ts`
- No external state/data-fetching libraries — kept deliberately minimal so
  the architecture itself (one hook, one dispatch table, one widget shell)
  is the thing on display
