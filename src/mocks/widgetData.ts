import type { KPIData, MetricData, ReportData, ReconData } from "../types/widget";

/**
 * Mock "backend" data, split by live vs published — deliberately different
 * values so the UI can actually demonstrate switching between them, the same
 * way real Portal data would differ between an editor's draft and what's
 * actually been published for viewers.
 */

export const mockKPIData: Record<"live" | "published", Record<string, KPIData>> = {
	live: {
		"metric-revenue": {
			value: 128_450,
			previousValue: 118_200,
			currency: "USD",
			byRegion: { "North America": 84_400, EMEA: 44_050 },
			trend: [96_200, 101_400, 108_900, 112_300, 118_200, 128_450],
			target: 125_000,
		},
	},
	published: {
		"metric-revenue": {
			value: 118_200,
			previousValue: 105_000,
			currency: "USD",
			byRegion: { "North America": 78_500, EMEA: 39_700 },
			trend: [88_100, 93_600, 99_200, 102_800, 105_000, 118_200],
			target: 125_000,
		},
	},
};

export const mockMetricData: Record<"live" | "published", Record<string, MetricData>> = {
	live: {
		"metric-revenue": {
			columns: ["Q1", "Q2", "Q3"],
			rows: [
				{ label: "North America", values: { Q1: 42_000, Q2: 45_500, Q3: 48_900 } },
				{ label: "EMEA", values: { Q1: 30_100, Q2: 31_200, Q3: 33_800 } },
			],
		},
	},
	published: {
		"metric-revenue": {
			columns: ["Q1", "Q2", "Q3"],
			rows: [
				{ label: "North America", values: { Q1: 40_000, Q2: 43_000, Q3: 45_000 } },
				{ label: "EMEA", values: { Q1: 29_000, Q2: 30_000, Q3: 31_500 } },
			],
		},
	},
};

export const mockReportData: Record<"live" | "published", Record<string, ReportData>> = {
	live: {
		"statement-monthly": {
			sections: [
				{
					title: "Assets",
					rows: [
						{ label: "Cash", value: "$52,000" },
						{ label: "Receivables", value: "$18,400" },
					],
				},
			],
		},
	},
	published: {
		"statement-monthly": {
			sections: [
				{
					title: "Assets",
					rows: [
						{ label: "Cash", value: "$48,000" },
						{ label: "Receivables", value: "$17,900" },
					],
				},
			],
		},
	},
};

export const mockReconData: Record<"live" | "published", Record<string, ReconData>> = {
	live: {
		"recon-bank": { matched: 942, unmatched: 12, total: 954 },
	},
	published: {
		"recon-bank": { matched: 930, unmatched: 20, total: 950 },
	},
};
