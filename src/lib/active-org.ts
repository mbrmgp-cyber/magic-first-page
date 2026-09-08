import { createMiddleware } from "@tanstack/react-start";

export const ACTIVE_ORG_KEY = "mbr.active_org";
export const ACTIVE_ORG_HEADER = "x-mbr-active-org";
const EVT = "mbr-active-org-change";

export function getActiveOrgId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function setActiveOrgId(orgId: string | null) {
  try {
    if (orgId) localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    else localStorage.removeItem(ACTIVE_ORG_KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: orgId }));
  } catch {}
}

export function onActiveOrgChange(cb: (orgId: string | null) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string | null>).detail ?? null);
  window.addEventListener(EVT, handler as EventListener);
  return () => window.removeEventListener(EVT, handler as EventListener);
}

/** Sends the chosen organization with every server call, so the backend
 *  resolves data for the org the user is currently working in. */
export const attachActiveOrg = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const orgId = getActiveOrgId();
    return next({ headers: orgId ? { [ACTIVE_ORG_HEADER]: orgId } : {} });
  },
);
