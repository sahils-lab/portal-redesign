/** Tiny inline trend line — used by KPIWidget so a card shows recent movement, not just a single point-in-time number. */
export function Sparkline({ values, width = 72, height = 24 }: { values: number[]; width?: number; height?: number }) {
	if (values.length < 2) return null;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const points = values
		.map((v, i) => {
			const x = (i / (values.length - 1)) * width;
			const y = height - ((v - min) / range) * height;
			return `${x},${y}`;
		})
		.join(" ");
	const rising = values[values.length - 1] >= values[0];

	return (
		<svg
			className="sparkline"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<polyline
				points={points}
				fill="none"
				stroke={rising ? "var(--color-success)" : "var(--color-danger)"}
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
