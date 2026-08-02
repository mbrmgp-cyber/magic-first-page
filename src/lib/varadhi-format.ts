/** Shared price/unit display helpers for Vaaradhi listings. */

export function formatAmount(price: number | string | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const raw = typeof price === "string" ? price.replace(/[^\d.-]/g, "") : price;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");
}

/** "Rs. 100 / కేజీ" — always shows the unit next to the rate when both exist. */
export function formatPrice(
  price: number | string | null | undefined,
  unit?: string | null,
): string {
  const amt = formatAmount(price);
  if (!amt) return unit ? `ధర సంప్రదించండి (${unit})` : "ధర సంప్రదించండి";
  return unit ? `Rs. ${amt} / ${unit}` : `Rs. ${amt}`;
}
