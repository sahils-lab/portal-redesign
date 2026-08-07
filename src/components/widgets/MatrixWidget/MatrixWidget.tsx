import { useMemo, useState } from "react";
import type { MatrixWidgetConfig } from "../../../types/widget";
import type { MeasureKey, DimensionKey } from "../../../types/analytics";
import { useGlobalFilters } from "../../../context/FilterContext";
import { usePortalContext } from "../../../context/PortalContext";
import { WidgetCard } from "../shared/WidgetCard";
import { salesRows } from "../../../mocks/salesData";
import { MEASURES, DIMENSIONS, applyGlobalFilters, applyCrossFilters, aggregateMatrix, formatMeasureValue } from "../../../utils/analytics";
import { downloadCsv } from "../../../utils/exportCsv";

const MEASURE_OPTIONS = Object.values(MEASURES);
const DIMENSION_OPTIONS = Object.keys(DIMENSIONS) as DimensionKey[];

/**
 * Cross-tab pivot (Power BI's Matrix visual): rows x columns, one measure
 * per cell, with a subtotal column, a subtotal/Total row, and a grand
 * total — the thing a flat TableWidget can't show (a single dimension's
 * ranked values) but a financial dashboard usually wants (e.g. Region x
 * Category revenue breakdown with rollups). Flat, not expandable/collapsible
 * — see docs/design-doc.md for that documented limitation.
 */
export function MatrixWidget({ config }: { config: MatrixWidgetConfig }) {
	const [rowDimension, setRowDimension] = useState<DimensionKey>(config.rowDimension);
	const [columnDimension, setColumnDimension] = useState<DimensionKey>(config.columnDimension);
	const [measure, setMeasure] = useState<MeasureKey>(config.measure);
	const { filters } = useGlobalFilters();
	const { crossFilters } = usePortalContext();

	const rows = useMemo(() => {
		let r = applyGlobalFilters(salesRows, filters);
		r = applyCrossFilters(r, crossFilters);
		return r;
	}, [filters, crossFilters]);

	const matrix = useMemo(
		() => aggregateMatrix(rows, rowDimension, columnDimension, measure),
		[rows, rowDimension, columnDimension, measure]
	);

	const measureDef = MEASURES[measure];
	const fmt = (v: number) => formatMeasureValue(v, measureDef.format);

	const handleExport = () => {
		downloadCsv(config.title, [
			[DIMENSIONS[rowDimension].label, ...matrix.colLabels, "Total"],
			...matrix.rowLabels.map((r) => [r, ...matrix.colLabels.map((c) => String(matrix.cells[r][c] ?? 0)), String(matrix.rowTotals[r] ?? 0)]),
			["Total", ...matrix.colLabels.map((c) => String(matrix.colTotals[c] ?? 0)), String(matrix.grandTotal)],
		]);
	};

	return (
		<WidgetCard
			title={config.title}
			onExport={matrix.rowLabels.length > 0 ? handleExport : undefined}
			tooltip={[
				{ label: "Rows", value: DIMENSIONS[rowDimension].label },
				{ label: "Columns", value: DIMENSIONS[columnDimension].label },
				{ label: "Measure", value: measureDef.label },
			]}
			toolbar={
				<div className="chart-widget__toolbar">
					<select className="select-sm" value={rowDimension} onChange={(e) => setRowDimension(e.target.value as DimensionKey)}>
						{DIMENSION_OPTIONS.map((d) => (
							<option key={d} value={d} disabled={d === columnDimension}>
								Rows: {DIMENSIONS[d].label}
							</option>
						))}
					</select>
					<select className="select-sm" value={columnDimension} onChange={(e) => setColumnDimension(e.target.value as DimensionKey)}>
						{DIMENSION_OPTIONS.map((d) => (
							<option key={d} value={d} disabled={d === rowDimension}>
								Cols: {DIMENSIONS[d].label}
							</option>
						))}
					</select>
					<select className="select-sm" value={measure} onChange={(e) => setMeasure(e.target.value as MeasureKey)}>
						{MEASURE_OPTIONS.map((m) => (
							<option key={m.key} value={m.key}>
								{m.label}
							</option>
						))}
					</select>
				</div>
			}
		>
			{matrix.rowLabels.length === 0 && <p className="chart-widget__empty">No data for the current filters.</p>}
			{matrix.rowLabels.length > 0 && (
				<div className="matrix-widget__scroll">
					<table className="matrix-widget__table">
						<thead>
							<tr>
								<th>{DIMENSIONS[rowDimension].label}</th>
								{matrix.colLabels.map((c) => (
									<th key={c}>{c}</th>
								))}
								<th className="matrix-widget__subtotal-col">Total</th>
							</tr>
						</thead>
						<tbody>
							{matrix.rowLabels.map((r) => (
								<tr key={r}>
									<td className="matrix-widget__row-label">{r}</td>
									{matrix.colLabels.map((c) => (
										<td key={c}>{fmt(matrix.cells[r][c] ?? 0)}</td>
									))}
									<td className="matrix-widget__subtotal-col">{fmt(matrix.rowTotals[r] ?? 0)}</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td>Total</td>
								{matrix.colLabels.map((c) => (
									<td key={c}>{fmt(matrix.colTotals[c] ?? 0)}</td>
								))}
								<td className="matrix-widget__subtotal-col">{fmt(matrix.grandTotal)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</WidgetCard>
	);
}
