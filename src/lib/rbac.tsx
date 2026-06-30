import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type SimRole = "super_admin" | "chit_admin" | "accounts_admin";

export const ROLE_LABELS: Record<SimRole, { en: string; te: string }> = {
  super_admin: { en: "Super Admin", te: "సూపర్ అడ్మిన్" },
  chit_admin: { en: "Chit Admin", te: "చిట్ అడ్మిన్" },
  accounts_admin: { en: "Accounts Admin", te: "అకౌంట్స్ అడ్మిన్" },
};

const KEY = "mbr.sim_role";
const EVT = "mbr-sim-role-change";

type Ctx = { role: SimRole; setRole: (r: SimRole) => void };
const RbacCtx = createContext<Ctx | null>(null);

export function RbacProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<SimRole>("super_admin");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as SimRole | null;
      if (v === "super_admin" || v === "chit_admin" || v === "accounts_admin") {
        setRoleState(v);
      }
    } catch {}
    const onChange = (e: Event) => {
      const r = (e as CustomEvent<SimRole>).detail;
      if (r) setRoleState(r);
    };
    window.addEventListener(EVT, onChange as EventListener);
    return () => window.removeEventListener(EVT, onChange as EventListener);
  }, []);

  const setRole = useCallback((r: SimRole) => {
    setRoleState(r);
    try { localStorage.setItem(KEY, r); } catch {}
    window.dispatchEvent(new CustomEvent(EVT, { detail: r }));
  }, []);

  return <RbacCtx.Provider value={{ role, setRole }}>{children}</RbacCtx.Provider>;
}

export function useSimRole() {
  const ctx = useContext(RbacCtx);
  if (!ctx) return { role: "super_admin" as SimRole, setRole: (_: SimRole) => {} };
  return ctx;
}

// Permission helpers
export function canAccess(role: SimRole, key: AccessKey): boolean {
  if (role === "super_admin") return true;
  if (role === "chit_admin") {
    return key === "dashboard" || key === "auction" || key === "auction_admin" || key === "members_view" || key === "chat";
  }
  if (role === "accounts_admin") {
    return key === "dashboard" || key === "accounts" || key === "income" || key === "expenses"
      || key === "cashflow" || key === "ledger" || key === "loans" || key === "members_view" || key === "chat";
  }
  return false;
}

export type AccessKey =
  | "dashboard"
  | "auction"
  | "auction_admin"
  | "accounts"
  | "income"
  | "expenses"
  | "cashflow"
  | "ledger"
  | "loans"
  | "members_view"
  | "members_admin"
  | "committee"
  | "rules"
  | "events"
  | "designs"
  | "elections"
  | "chat"
  | "admin_panel";

// Map dashboard menu routes to access keys
export const ROUTE_ACCESS: Record<string, AccessKey> = {
  "/org/rules": "rules",
  "/org/members": "members_admin",
  "/org/committee": "committee",
  "/org/events": "events",
  "/org/designs": "designs",
  "/org/accounts-hub": "accounts",
  "/org/chat": "chat",
  "/org/elections": "elections",
  "/org/auction": "auction",
};
