export const MBR_SHARE_ORIGIN = "https://mbr.mbrplatform.com";

export const SHARE_DESTINATIONS = {
  register: { path: "/member/register", module: null },
  dashboard: { path: "/org/dashboard", module: null },
  members: { path: "/org/members", module: "members" },
  rules: { path: "/org/rules", module: "rules" },
  committee: { path: "/org/committee", module: "committee" },
  events: { path: "/org/events", module: "events" },
  designs: { path: "/org/designs", module: "designs" },
  accounts: { path: "/org/accounts-hub", module: "accounts" },
  income: { path: "/org/income", module: "accounts" },
  expenses: { path: "/org/expenses", module: "accounts" },
  cashflow: { path: "/org/cashflow", module: "accounts" },
  ledger: { path: "/org/master-ledger", module: "accounts" },
  loans: { path: "/org/loan-requests", module: "accounts" },
  chat: { path: "/org/chat", module: "chat" },
  elections: { path: "/org/elections", module: "elections" },
  auction: { path: "/org/auction", module: "auction" },
  disciplinary: { path: "/org/disciplinary", module: "disciplinary" },
  bank: { path: "/org/bank-details", module: "bank_details" },
  theme: { path: "/org/theme", module: "theme" },
  subscription: { path: "/org/subscription", module: "owner" },
  access: { path: "/org/admin-access", module: "owner" },
} as const;

export type ShareDestination = keyof typeof SHARE_DESTINATIONS;

export function shareDestination(value: unknown): ShareDestination {
  return typeof value === "string" && Object.hasOwn(SHARE_DESTINATIONS, value)
    ? value as ShareDestination : "register";
}

export function destinationForPath(path: string): ShareDestination {
  const entry = Object.entries(SHARE_DESTINATIONS).find(([, value]) => value.path === path);
  return entry ? shareDestination(entry[0]) : "dashboard";
}

export function organizationShareUrl(code: string, destination: ShareDestination = "register") {
  return `${MBR_SHARE_ORIGIN}/society/${encodeURIComponent(code.trim().toUpperCase())}?destination=${destination}`;
}

export function hasShareAccess(input: {
  owner: boolean; committee: boolean; activeMember: boolean; modules: string[];
}, destination: ShareDestination): boolean {
  if (destination === "register") return false;
  if (input.owner) return true;
  if (!input.activeMember || !input.committee) return false;
  const module = SHARE_DESTINATIONS[destination].module;
  return module === null || (module !== "owner" && input.modules.includes(module));
}

/** Accept only the society's raster logo in the configured storage service. */
export function organizationLogoPath(value: string, storageOrigin: string): string | null {
  let path = value;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(storageOrigin).origin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/org-documents\/(.+)$/);
      if (!match?.[1]) return null;
      path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  if (path.includes("..") || path.startsWith("/") || !path.includes("/logo/") || !/\.(?:jpe?g|png|webp)$/i.test(path)) return null;
  return path;
}