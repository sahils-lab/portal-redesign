export type DeviceMode = "desktop" | "tablet" | "mobile";

/**
 * Widget positions are a fixed 8-column grid, not a true responsive layout
 * (same limitation the real Portal has — see docs/design-doc.md). This is a
 * device-WIDTH preview, not a reflow: constraining the canvas to a device's
 * viewport width shows what actually fits vs. gets clipped/scrolled, which
 * is honestly informative even without real breakpoint-based reflow.
 */
export const deviceWidths: Record<DeviceMode, number | null> = {
	desktop: null,
	tablet: 768,
	mobile: 390,
};
