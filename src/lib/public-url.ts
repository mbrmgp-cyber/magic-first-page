// Magic-link / QR links must point at the domain members actually use,
// otherwise the session is created on a different origin and the app keeps
// asking for the email again.
import { organizationShareUrl } from "@/lib/organization-share";

export const PUBLIC_APP_ORIGIN = "https://mbrplatform.com";

export function memberRegistrationUrl(orgCode?: string | null) {
  const code = (orgCode || "").trim();
  return code ? organizationShareUrl(code) : `${PUBLIC_APP_ORIGIN}/member/register`;
}

// Public per-member verification URL used by the front-side QR on ID cards.
// Scanning it opens a page that shows the member's name, photo, ID and
// active status — proving the card belongs to that person.
export function memberVerifyUrl(memberCode?: string | null) {
  const code = (memberCode || "").trim();
  if (!code) return `${PUBLIC_APP_ORIGIN}/`;
  return `${PUBLIC_APP_ORIGIN}/m/${encodeURIComponent(code)}`;
}
