import { supabase } from "@/integrations/supabase/client";

export type NavigateFn = (opts: { to: string; replace?: boolean }) => void;

/**
 * Route an authenticated user to the correct dashboard based on their role /
 * organization / membership state. Shared between /auth, / (portal) and /mbr
 * so a returning user (e.g. opening the installed PWA icon) lands directly on
 * their account instead of being asked for an email again.
 */
export async function routeAfterLogin(userId: string, navigate: NavigateFn) {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roles?.some((r) => r.role === "mbr_admin")) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    const { data: org } = await supabase
      .from("organizations")
      .select("id, approval_status")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (org) {
      navigate({ to: "/org/dashboard", replace: true });
      return;
    }
    const { getMyMembership } = await import("@/lib/org.functions");
    const res = await getMyMembership().catch(() => ({ membership: null as any }));
    const m: any = res?.membership;
    if (m) {
      if (m.status === "approved") navigate({ to: "/member/dashboard", replace: true });
      else navigate({ to: "/member/pending", replace: true });
      return;
    }
    navigate({ to: "/org/register", replace: true });
  } catch {
    navigate({ to: "/mbr", replace: true });
  }
}
