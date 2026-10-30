import promotionVideo from "@/assets/videos/vaaradhi-promotion-silent.mp4.asset.json";

export type GlobalAd = { id: string; url: string; label: string | null; active: boolean; sort_order: number; organization_ids: string[] | null };
export const PROMOTION_ID = "a204d8a2-32a0-4b46-906a-48094420de91";
export const PROMOTION_URL = "builtin:vaaradhi-promotion";
export const defaultPromotion: GlobalAd = { id: PROMOTION_ID, url: PROMOTION_URL, label: "Vaaradhi promotion", active: true, sort_order: -1, organization_ids: null };
export function managedAds(rows: GlobalAd[]): GlobalAd[] {
  return (rows.some((row) => row.id === PROMOTION_ID) ? rows : [defaultPromotion, ...rows]).slice().sort((a, b) => a.sort_order - b.sort_order);
}
export function adVisibleInOrganization(ad: GlobalAd, orgId: string | null): boolean {
  return ad.active && (ad.organization_ids === null || (!!orgId && ad.organization_ids.includes(orgId)));
}
export function adMediaKind(url: string): "image" | "video" {
  return url === PROMOTION_URL || /\.(mp4|webm|mov|m4v|ogv)$/i.test(url.split("?")[0]) ? "video" : "image";
}
export async function resolveAdUrl(url: string, sign: (path: string) => Promise<string>): Promise<string> {
  if (url === PROMOTION_URL) return promotionVideo.url;
  if (/^https?:\/\//i.test(url)) return url;
  return sign(url);
}