import { useEffect, useRef, useState } from "react";
import type { WidgetDataResult, DataWidgetType } from "../types/widget";
import { widgetFetchers } from "../api/widgetApi";
import { usePortalContext } from "../context/PortalContext";

/**
 * The one and only place that decides "fetch live or published data" and
 * runs the actual fetch. Every widget type (KPI/Metric/Report/Recon) calls
 * this instead of each having its own copy of that logic.
 *
 * In the real Portal codebase, this exact decision (`useLiveDefinition`) was
 * duplicated across KPICardContainer, KPICardModalContainer,
 * MetricCardContainer, and MetricCardModalContainer — and the copies had
 * already drifted (one was missing a default value the others had). Fixing
 * that means there being exactly one implementation, used by every widget.
 *
 * Generic over T so each widget gets back its own typed data shape
 * (KPIData, MetricData, etc.) without this hook needing to know about any
 * specific widget's data model.
 */
export function useWidgetData<T>(type: DataWidgetType, entityId: string): WidgetDataResult<T> & { retry: () => void } {
	const { dataMode } = usePortalContext();
	const [retryCount, setRetryCount] = useState(0);
	const [result, setResult] = useState<WidgetDataResult<T>>({
		status: "loading",
		data: null,
		error: null,
		source: dataMode,
	});

	// Guards against a stale response overwriting a newer one if entityId/mode
	// changes again before the first fetch resolves.
	const requestId = useRef(0);

	useEffect(() => {
		const thisRequest = ++requestId.current;
		setResult({ status: "loading", data: null, error: null, source: dataMode });

		const fetcher = widgetFetchers[type] as (entityId: string, mode: typeof dataMode) => Promise<T>;

		fetcher(entityId, dataMode)
			.then((data) => {
				if (thisRequest !== requestId.current) return;
				setResult({ status: "success", data, error: null, source: dataMode });
			})
			.catch((err: unknown) => {
				if (thisRequest !== requestId.current) return;
				const message = err instanceof Error ? err.message : "Failed to load widget data";
				setResult({ status: "error", data: null, error: message, source: dataMode });
			});
	}, [type, entityId, dataMode, retryCount]);

	return { ...result, retry: () => setRetryCount((c) => c + 1) };
}
