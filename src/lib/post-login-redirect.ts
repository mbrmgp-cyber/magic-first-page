import { supabase } from "@/integrations/supabase/client";

export type NavigateFn = (opts: { to: string; replace?: boolean }) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run a fetch with retries. Returns { ok, value }: ok=false means every
 *  attempt errored, so the answer is UNKNOWN (never treat as "no data"). */
async function fetchWithRetry<T>(
  fn: () => Promise<{ data: T | null; error: unknown }>,
  attempts = 3,
): Promise<{ ok: boolean; value: T | null }> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const { data, error } = await fn();
      if (!error) return { ok: true, value: data ?? null };
    } catch {
      /* retry */
    }
    if (i < attempts - 1) await sleep(500 * (i + 1));
  }
  return { ok: false, value: null };
}

/**
 * Route an authenticated user to the correct dashboard based on their role /
 * organization / membership state. Shared between /auth, / (portal) and /mbr.
 *
 * Important: we only send someone to the "join an organization" screen after
 * every lookup has actually SUCCEEDED and come back empty. If a lookup fails
 * (network hiccup, bearer token not attached yet on a fresh session) we retry,
 * and if it still fails we leave the user where they are instead of wrongly
 * telling an existing member that they have no organization.
 */
export async function routeAfterLogin(userId: string, navigate: NavigateFn) {
  // 1) Platform admin role
  const roles = await fetchWithRetry(() =>
    supabase.from("user_roles").select("role").eq("user_id", userId),
  );
  if (roles.ok && (roles.value as any[] | null)?.some((r) => r.role === "mbr_admin")) {
    navigate({ to: "/admin", replace: true });
    return;
  }

  // 2) Organization owned by this user
  const org = await fetchWithRetry(() =>
    supabase
      .from("organizations")
      .select("id, approval_status")
      .eq("admin_user_id", userId)
      .maybeSingle(),
  );
  if (org.ok && org.value) {
    navigate({ to: "/org/dashboard", replace: true });
    return;
  }

  // 3) Membership (server fn — needs the bearer token, which may attach late)
  let membershipKnown = false;
  let membership: any = null;
  try {
    const { getMyMembership } = await import("@/lib/org.functions");
    for (let i = 0; i < 4; i += 1) {
      try {
        const res: any = await getMyMembership();
        membershipKnown = true;
        membership = res?.membership ?? null;
        if (membership) break;
      } catch {
        /* keep retrying: usually the token isn't attached yet */
      }
      if (i < 3) await sleep(600 * (i + 1));
    }
  } catch {
    /* module load failure — treated as unknown below */
  }

  if (membership) {
    navigate({
      to: membership.status === "approved" ? "/member/dashboard" : "/member/pending",
      replace: true,
    });
    return;
  }

  // Everything answered and the user genuinely has nothing yet.
  if (roles.ok && org.ok && membershipKnown) {
    navigate({ to: "/member/pending", replace: true });
    return;
  }

  // Unknown state: do not bounce the user to the join screen.
  console.warn("[routeAfterLogin] could not verify account state; staying put");
}
