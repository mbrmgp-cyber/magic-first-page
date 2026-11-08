/**
 * Browser-safe display helpers for Vaaradhi service and free-service posts.
 * Every option a poster fills on the Upload form must be visible on the post.
 */

type ServiceListing = {
  post_type?: string | null;
  sub_category?: string | null;
  price?: number | string | null;
  unit?: string | null;
  experience?: string | null;
  service_mode?: string | null;
  service_timing?: string | null;
  service_area?: string | null;
};

export type ServiceDetailRow = { label: string; value: string };

const clean = (v: string | null | undefined) => (v ?? "").trim();

export function isServiceListing(l: ServiceListing): boolean {
  const t = l.post_type ?? "business";
  return t === "service" || t === "free";
}

function isBloodListing(l: ServiceListing): boolean {
  return l.post_type === "free" && l.sub_category === "blood";
}

function hasPrice(price: ServiceListing["price"]): boolean {
  if (price === null || price === undefined || price === "") return false;
  const n = Number(price);
  return Number.isFinite(n) && n > 0;
}

/** Charge method typed by a paid-service poster when no amount is given (e.g. "కమిషన్"). */
export function serviceChargeText(l: ServiceListing): string | null {
  if (l.post_type !== "service" || hasPrice(l.price)) return null;
  return clean(l.unit) || null;
}

/** Labelled rows for the post page. Blood posts keep their own dedicated chips. */
export function serviceDetailRows(l: ServiceListing): ServiceDetailRow[] {
  if (!isServiceListing(l) || isBloodListing(l)) return [];
  const rows: ServiceDetailRow[] = [];
  const add = (label: string, value: string | null | undefined) => {
    const v = clean(value);
    if (v) rows.push({ label, value: v });
  };
  add("అనుభవం", l.experience);
  add("ఛార్జి పద్ధతి", serviceChargeText(l));
  add("సేవా విధానం", l.service_mode);
  add("సేవ సమయం", l.service_timing);
  add("సేవ పరిధి", l.service_area);
  return rows;
}

/** One compact line for Home post cards. */
export function serviceCardSummary(l: ServiceListing): string | null {
  if (!isServiceListing(l)) return null;
  if (isBloodListing(l)) return clean(l.experience) || null;
  const parts = [l.experience, l.service_mode, l.service_timing, l.service_area].map(clean).filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
