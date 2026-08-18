/**
 * Security helpers for public (unauthenticated) org-code lookups and image uploads.
 */

/** Strip anything that is not A-Z / 0-9 so the value can never inject PostgREST filter syntax. */
export function sanitizeOrgCode(code: string): string {
  return (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 64);
}

/**
 * Look up an organization by org_code or letter_code using two parameterized
 * .eq() queries instead of interpolating user input into a raw .or() filter.
 */
export async function findOrgByCode(
  supabaseAdmin: any,
  rawCode: string,
  columns = "id"
): Promise<any | null> {
  const code = sanitizeOrgCode(rawCode);
  if (!code) return null;
  const byOrgCode = await supabaseAdmin
    .from("organizations")
    .select(columns)
    .eq("org_code", code)
    .maybeSingle();
  if (byOrgCode.data) return byOrgCode.data;
  const byLetter = await supabaseAdmin
    .from("organizations")
    .select(columns)
    .eq("letter_code", code)
    .maybeSingle();
  return byLetter.data ?? null;
}

/** Only raster image types are accepted; SVG and other markup-capable formats are rejected. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

export function parseSafeImageDataUrl(dataUrl: string): { contentType: string; bytes: Uint8Array; ext: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image file");
  const contentType = match[1].toLowerCase();
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("Only JPG, PNG or WEBP images are allowed");
  }
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { contentType, bytes, ext };
}
