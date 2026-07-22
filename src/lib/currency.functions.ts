import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED = new Set(["INR", "USD", "AED", "KWD", "MYR"]);

function normalizeCurrency(input: unknown) {
  const code = String(input ?? "INR").trim().toUpperCase();
  return ALLOWED.has(code) ? code : "INR";
}

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (org?.id) return org.id;

  const { data: member } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return member?.org_id ?? null;
}

export const getOrgCurrencyPreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { currency: "INR" as const };

    const { data: org } = await supabase
      .from("organizations")
      .select("theme_settings")
      .eq("id", orgId)
      .maybeSingle();

    const settings = (org?.theme_settings ?? {}) as Record<string, unknown>;
    const hasPreference = typeof settings.display_currency === "string" && ALLOWED.has(String(settings.display_currency).toUpperCase());
    return { currency: normalizeCurrency(settings.display_currency), hasPreference };
  });

export const setOrgCurrencyPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { currency: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const currency = normalizeCurrency(data.currency);

    const { data: org, error: readError } = await supabase
      .from("organizations")
      .select("id, theme_settings")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!org?.id) return { ok: false as const, currency };

    const settings = { ...((org.theme_settings ?? {}) as Record<string, unknown>), display_currency: currency };
    const { error } = await supabase
      .from("organizations")
      .update({ theme_settings: settings } as any)
      .eq("id", org.id);
    if (error) throw new Error(error.message);

    return { ok: true as const, currency };
  });