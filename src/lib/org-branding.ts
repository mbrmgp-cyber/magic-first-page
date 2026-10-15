/**
 * Remembers the last organization the user worked in (name + logo + colors)
 * so that even on public screens (login page) the "add to home screen" icon
 * shows THEIR organization logo instead of the generic MBR logo.
 */
export type CachedOrgBranding = {
  name: string;
  shortName: string;
  logoUrl: string;
  bg: string;
  iconBg: string;
  orgCode?: string | null;
};

/** Home-screen shortcut start page: the society's own welcome/login portal. */
export function orgStartUrl(code?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const c = (code || "").trim();
  return c ? `${origin}/member/register?code=${encodeURIComponent(c)}&portal=1` : `${origin}/`;
}

const KEY = "mbr.org_branding";

export function saveOrgBranding(b: CachedOrgBranding) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
}

export function getOrgBranding(): CachedOrgBranding | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CachedOrgBranding;
    return v && v.logoUrl ? v : null;
  } catch {
    return null;
  }
}

export function clearOrgBranding() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
