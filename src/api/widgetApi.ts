import type { DataMode, KPIData, MetricData, ReportData, ReconData, DataWidgetType } from "../types/widget";
import { mockKPIData, mockMetricData, mockReportData, mockReconData } from "../mocks/widgetData";

/**
 * Simulates a real network call: async, latency, and can fail — so components
 * built against this behave the same way they will once a real backend swaps
 * in behind it. This is the ONE place that knows how to fetch each widget
 * type's data; widgets never reach into the mock data directly.
 */
function simulateFetch<T>(value: T | undefined, entityId: string): Promise<T> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (value === undefined) {
				reject(new Error(`No data found for "${entityId}"`));
				return;
			}
			resolve(value);
		}, 400 + Math.random() * 400);
	});
}

export function fetchKPIData(metricId: string, mode: DataMode): Promise<KPIData> {
	return simulateFetch(mockKPIData[mode][metricId], metricId);
}

export function fetchMetricData(metricId: string, mode: DataMode): Promise<MetricData> {
	return simulateFetch(mockMetricData[mode][metricId], metricId);
}

export function fetchReportData(statementId: string, mode: DataMode): Promise<ReportData> {
	return simulateFetch(mockReportData[mode][statementId], statementId);
}

export function fetchReconData(reconId: string, mode: DataMode): Promise<ReconData> {
	return simulateFetch(mockReconData[mode][reconId], reconId);
}

/**
 * Single dispatch point from widget type -> fetch function. This is what
 * replaces the real Portal's duplicated per-widget-type routing logic
 * (KPICardContainer/MetricCardContainer each independently deciding
 * live-vs-published) with one shared lookup.
 */
export const widgetFetchers = {
	kpi: fetchKPIData,
	metric: fetchMetricData,
	report: fetchReportData,
	recon: fetchReconData,
} satisfies Record<DataWidgetType, (entityId: string, mode: DataMode) => Promise<unknown>>;
