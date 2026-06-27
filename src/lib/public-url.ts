export const PUBLIC_APP_ORIGIN = "https://magic-first-page.lovable.app";

export function memberRegistrationUrl(orgCode?: string | null) {
  const code = (orgCode || "").trim();
  return `${PUBLIC_APP_ORIGIN}/member/register${code ? `?code=${encodeURIComponent(code)}` : ""}`;
}
