export const PUBLIC_APP_ORIGIN = "https://magic-first-page.lovable.app";

export function memberRegistrationUrl(orgCode?: string | null) {
  const code = (orgCode || "").trim();
  return `${PUBLIC_APP_ORIGIN}/member/register${code ? `?code=${encodeURIComponent(code)}` : ""}`;
}

// Public per-member verification URL used by the front-side QR on ID cards.
// Scanning it opens a page that shows the member's name, photo, ID and
// active status — proving the card belongs to that person.
export function memberVerifyUrl(memberCode?: string | null) {
  const code = (memberCode || "").trim();
  if (!code) return `${PUBLIC_APP_ORIGIN}/`;
  return `${PUBLIC_APP_ORIGIN}/m/${encodeURIComponent(code)}`;
}
