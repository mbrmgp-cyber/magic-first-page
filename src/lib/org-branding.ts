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
};

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
