/** Shared price/unit display helpers for Vaaradhi listings. */

export function formatAmount(price: number | string | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const raw = typeof price === "string" ? price.replace(/[^\d.-]/g, "") : price;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");
}

/** Free-service posts (post_type = "free") never show a price. */
export function isFreeListing(l: unknown): boolean {
  return ((l as { post_type?: string } | null)?.post_type ?? "business") === "free";
}

/** Fallback label when no price exists. Free services just say "సంప్రదించండి". */
export function noPriceLabel(free?: boolean): string {
  return free ? "సంప్రదించండి" : "ధర సంప్రదించండి";
}

/** "Rs. 100 / కేజీ" — always shows the unit next to the rate when both exist. */
export function formatPrice(
  price: number | string | null | undefined,
  unit?: string | null,
  free?: boolean,
): string {
  const amt = formatAmount(price);
  if (!amt) return free ? "సంప్రదించండి" : unit ? `ధర సంప్రదించండి (${unit})` : "ధర సంప్రదించండి";
  return unit ? `Rs. ${amt} / ${unit}` : `Rs. ${amt}`;
}
