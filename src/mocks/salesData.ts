import type { SalesRow } from "../types/analytics";

/**
 * Generated mock fact table — order-line grain, ~2 years of daily data
 * across a real dimensional model (region -> warehouse, category ->
 * subcategory -> product, brand, seller, customer). This is what every
 * interactive feature in this batch (cross-filtering, drill-down/through,
 * global filters, dynamic field switching, key influencers, etc.) actually
 * queries — a single shared fact table instead of each widget carrying its
 * own bespoke mock shape, the same "one source of truth" principle as the
 * rest of this prototype.
 *
 * Deterministic (seeded PRNG) so reloading the app doesn't reshuffle the
 * numbers — filters, bookmarks, and screenshots stay stable across runs.
 */

// ---------- Deterministic PRNG (mulberry32) ----------
function mulberry32(seed: number) {
	let a = seed;
	return function random() {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(20240101);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

// ---------- Dimension domains ----------
export const REGIONS = ["North America", "EMEA", "APAC", "LATAM"] as const;

export const WAREHOUSES_BY_REGION: Record<string, string[]> = {
	"North America": ["Dallas DC", "Newark DC"],
	EMEA: ["Rotterdam DC", "Frankfurt DC"],
	APAC: ["Singapore DC"],
	LATAM: ["Sao Paulo DC"],
};
export const WAREHOUSES = Object.values(WAREHOUSES_BY_REGION).flat();

export const BUSINESS_UNITS = ["Retail", "Wholesale", "E-Commerce"] as const;

interface CategoryDef {
	category: string;
	subcategories: { subcategory: string; products: { name: string; basePrice: number }[] }[];
}

export const CATALOG: CategoryDef[] = [
	{
		category: "Electronics",
		subcategories: [
			{
				subcategory: "Audio",
				products: [
					{ name: "Wireless Earbuds", basePrice: 89 },
					{ name: "Bluetooth Speaker", basePrice: 64 },
				],
			},
			{
				subcategory: "Computing",
				products: [
					{ name: "Laptop Stand", basePrice: 42 },
					{ name: "Wireless Mouse", basePrice: 29 },
				],
			},
		],
	},
	{
		category: "Apparel",
		subcategories: [
			{
				subcategory: "Menswear",
				products: [
					{ name: "Cotton Tee", basePrice: 22 },
					{ name: "Denim Jacket", basePrice: 78 },
				],
			},
			{
				subcategory: "Womenswear",
				products: [
					{ name: "Summer Dress", basePrice: 54 },
					{ name: "Yoga Pants", basePrice: 38 },
				],
			},
		],
	},
	{
		category: "Home & Garden",
		subcategories: [
			{
				subcategory: "Furniture",
				products: [
					{ name: "Office Chair", basePrice: 165 },
					{ name: "Bookshelf", basePrice: 120 },
				],
			},
			{
				subcategory: "Decor",
				products: [
					{ name: "Table Lamp", basePrice: 46 },
					{ name: "Wall Art", basePrice: 58 },
				],
			},
		],
	},
	{
		category: "Sports",
		subcategories: [
			{
				subcategory: "Fitness",
				products: [
					{ name: "Yoga Mat", basePrice: 34 },
					{ name: "Dumbbell Set", basePrice: 95 },
				],
			},
			{
				subcategory: "Outdoor",
				products: [
					{ name: "Camping Tent", basePrice: 140 },
					{ name: "Hiking Backpack", basePrice: 88 },
				],
			},
		],
	},
	{
		category: "Grocery",
		subcategories: [
			{
				subcategory: "Beverages",
				products: [
					{ name: "Cold Brew Coffee", basePrice: 6 },
					{ name: "Sparkling Water", basePrice: 4 },
				],
			},
			{
				subcategory: "Snacks",
				products: [
					{ name: "Protein Bar", basePrice: 3 },
					{ name: "Trail Mix", basePrice: 5 },
				],
			},
		],
	},
	{
		category: "Beauty",
		subcategories: [
			{
				subcategory: "Skincare",
				products: [
					{ name: "Face Serum", basePrice: 32 },
					{ name: "Moisturizer", basePrice: 26 },
				],
			},
			{
				subcategory: "Haircare",
				products: [
					{ name: "Shampoo", basePrice: 14 },
					{ name: "Hair Oil", basePrice: 18 },
				],
			},
		],
	},
];

export const BRANDS = ["Nova", "Atlas", "Vertex", "Solace", "Kite", "Marble", "Fenwick", "Coral"];

export const SELLERS = [
	"J. Romero",
	"A. Chen",
	"M. Novak",
	"S. Patel",
	"D. Okafor",
	"L. Fischer",
	"R. Silva",
	"T. Nakamura",
	"E. Kowalski",
	"P. Andersen",
	"N. Haddad",
	"C. Duval",
];

const CUSTOMER_PREFIXES = [
	"Northwind",
	"Bright",
	"Cedar",
	"Vantage",
	"Harbor",
	"Summit",
	"Lumen",
	"Craft",
	"Union",
	"Pioneer",
	"Anchor",
	"Meridian",
	"Falcon",
	"Granite",
	"Orbit",
	"Halcyon",
	"Ridgeline",
	"Beacon",
	"Foundry",
	"Wayfair",
];
export const CUSTOMERS = CUSTOMER_PREFIXES.flatMap((p) => [`${p} Group`, `${p} Co`]);

const PRODUCT_LOOKUP = CATALOG.flatMap((c) =>
	c.subcategories.flatMap((s) => s.products.map((p) => ({ ...p, category: c.category, subcategory: s.subcategory })))
);
export const CATEGORIES = CATALOG.map((c) => c.category);

function toIsoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function generateRows(): SalesRow[] {
	const rows: SalesRow[] = [];
	const start = new Date("2024-01-01T00:00:00Z");
	const end = new Date("2025-12-31T00:00:00Z");
	let rowId = 0;

	for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
		const dow = d.getUTCDay();
		const isWeekend = dow === 0 || dow === 6;
		// Mild year-over-year growth + seasonal Q4 bump + weekend dip — enough
		// signal for trend sparklines and (later) insight/anomaly detection to
		// have something real to find, without hand-authoring every number.
		const monthsSinceStart = (d.getUTCFullYear() - 2024) * 12 + d.getUTCMonth();
		const growth = 1 + monthsSinceStart * 0.012;
		const seasonal = d.getUTCMonth() === 10 || d.getUTCMonth() === 11 ? 1.35 : 1;
		const weekendFactor = isWeekend ? 0.6 : 1;
		const ordersToday = Math.max(1, Math.round(randInt(3, 8) * growth * seasonal * weekendFactor));

		for (let i = 0; i < ordersToday; i++) {
			const product = pick(PRODUCT_LOOKUP);
			const region = pick(REGIONS);
			const warehouse = pick(WAREHOUSES_BY_REGION[region]);
			const quantity = randInt(1, 5);
			const priceJitter = 0.85 + rand() * 0.3;
			const revenue = Math.round(product.basePrice * quantity * priceJitter * 100) / 100;
			const margin = 0.15 + rand() * 0.2;
			const profit = Math.round(revenue * margin * 100) / 100;
			const returned = rand() < 0.06;

			rows.push({
				id: `r${rowId++}`,
				date: toIsoDate(d),
				region,
				businessUnit: pick(BUSINESS_UNITS),
				warehouse,
				category: product.category,
				subcategory: product.subcategory,
				product: product.name,
				brand: pick(BRANDS),
				seller: pick(SELLERS),
				customer: pick(CUSTOMERS),
				revenue,
				profit,
				quantity,
				returned,
			});
		}
	}
	return rows;
}

export const salesRows: SalesRow[] = generateRows();
