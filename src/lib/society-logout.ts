import { supabase } from "@/integrations/supabase/client";

export const LAST_ORG_CODE_KEY = "mbr.last_org_code";

export function rememberSocietyCode(code?: string | null) {
  try {
    if (code) localStorage.setItem(LAST_ORG_CODE_KEY, code);
  } catch {}
}

export function getRememberedSocietyCode(): string | null {
  try {
    return localStorage.getItem(LAST_ORG_CODE_KEY);
  } catch {
    return null;
  }
}

/** Sign out and land on the society's own welcome/login screen. */
export async function signOutToSociety(navigate: (o: any) => void, code?: string | null) {
  const c = code || getRememberedSocietyCode();
  rememberSocietyCode(c);
  try { await supabase.auth.signOut(); } catch {}
  if (c) navigate({ to: "/member/register", search: { code: c, portal: "1" }, replace: true });
  else navigate({ to: "/auth", replace: true });
}
