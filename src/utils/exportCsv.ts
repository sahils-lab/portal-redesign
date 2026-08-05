function escapeCsvCell(cell: string): string {
	if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
	return cell;
}

/** Serializes rows straight to a downloaded .csv, no server round-trip needed. */
export function downloadCsv(filename: string, rows: string[][]): void {
	const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}
