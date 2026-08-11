import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PartnerLevel } from "@/lib/varadhi-partner";

// -------- Referral code (used at signup / onboarding)
export const validateReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = (data.code ?? "").trim().toUpperCase();
    if (!code) return { valid: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("varadhi_partners")
      .select("id, level, state, district, mandal, full_name, is_active")
      .eq("referral_code", code)
      .maybeSingle();
    if (!p || !(p as any).is_active) return { valid: false as const };
    return { valid: true as const, partner: p };
  });

// -------- Partner dashboard
export const getMyPartnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partner } = await supabaseAdmin
      .from("varadhi_partners")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!partner) return { partner: null };

    const p: any = partner;
    const [{ data: commissions }, { data: payouts }, { data: referrals }] = await Promise.all([
      supabaseAdmin
        .from("varadhi_commissions")
        .select("*")
        .eq("partner_id", p.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("varadhi_payout_requests")
        .select("*")
        .eq("partner_id", p.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("varadhi_profiles")
        .select("user_id, full_name, city, mandal, district, created_at")
        .eq("referred_partner_id", p.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const rows: any[] = commissions ?? [];
    const now = Date.now();
    const sum = (f: (r: any) => boolean) =>
      rows.filter(f).reduce((s, r) => s + Number(r.amount || 0), 0);

    const totals = {
      referrals: (referrals ?? []).length,
      subscriptions: rows.length,
      earned: sum(() => true),
      locked: sum((r) => r.status === "pending" && new Date(r.unlock_at).getTime() > now),
      unlocked: sum((r) => r.status === "pending" && new Date(r.unlock_at).getTime() <= now),
      requested: sum((r) => r.status === "requested"),
      paid: sum((r) => r.status === "paid"),
    };

    const lastRequest = (payouts ?? [])[0] as any;
    const canRequest =
      totals.unlocked > 0 &&
      (!lastRequest ||
        now - new Date(lastRequest.created_at).getTime() > 7 * 24 * 60 * 60 * 1000);

    return {
      partner: p,
      totals,
      canRequest,
      commissions: rows,
      payouts: payouts ?? [],
      referrals: referrals ?? [],
    };
  });

export const requestPartnerPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { note?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { error, data: out } = await context.supabase.rpc("varadhi_request_payout" as any, {
      _note: data.note ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { payout: out };
  });

// -------- Admin management
export const adminListPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    const { data: partners } = await admin
      .from("varadhi_partners")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    const ids = (partners ?? []).map((p: any) => p.id);
    let earnings: Record<string, { earned: number; paid: number }> = {};
    if (ids.length) {
      const { data: rows } = await admin
        .from("varadhi_commissions")
        .select("partner_id, amount, status")
        .in("partner_id", ids);
      for (const r of (rows ?? []) as any[]) {
        const e = (earnings[r.partner_id] ??= { earned: 0, paid: 0 });
        e.earned += Number(r.amount || 0);
        if (r.status === "paid") e.paid += Number(r.amount || 0);
      }
    }
    return {
      partners: (partners ?? []).map((p: any) => ({
        ...p,
        earned: earnings[p.id]?.earned ?? 0,
        paid: earnings[p.id]?.paid ?? 0,
      })),
    };
  });

export const adminCreatePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    email: string;
    level: PartnerLevel;
    state: string;
    district?: string;
    mandal?: string;
    full_name?: string;
    phone?: string;
    commission_pct?: number;
    referral_code?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    const email = (data.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("Email required");
    if (!data.state?.trim()) throw new Error("State required");
    if (data.level !== "state" && !data.district?.trim()) throw new Error("District required");
    if (data.level === "mandal" && !data.mandal?.trim()) throw new Error("Mandal required");

    // find or create the auth user for this partner
    let userId: string | null = null;
    for (let page = 1; page <= 20; page += 1) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x: any) => x.email?.toLowerCase() === email);
      if (u) { userId = u.id; break; }
      if (list.users.length < 1000) break;
    }
    if (!userId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: `VARADHI-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { app: "varadhi" },
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not resolve partner user");

    const { buildReferralCode } = await import("@/lib/varadhi-partner.server");
    const { PARTNER_DEFAULT_PCT } = await import("@/lib/varadhi-partner");
    const code =
      (data.referral_code ?? "").trim().toUpperCase() ||
      buildReferralCode(data.level, data.mandal || data.district || data.state);

    const { data: row, error } = await admin
      .from("varadhi_partners")
      .insert({
        user_id: userId,
        level: data.level,
        state: data.state.trim(),
        district: data.district?.trim() || null,
        mandal: data.mandal?.trim() || null,
        full_name: data.full_name?.trim() || null,
        phone: data.phone?.trim() || null,
        referral_code: code,
        commission_pct: data.commission_pct ?? PARTNER_DEFAULT_PCT[data.level],
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { partner: row };
  });

export const adminSetPartnerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { partner_id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    const { error } = await admin
      .from("varadhi_partners")
      .update({ is_active: data.is_active })
      .eq("id", data.partner_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPayoutRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    const { data: rows } = await admin
      .from("varadhi_payout_requests")
      .select("*, varadhi_partners(full_name, level, state, district, mandal, referral_code)")
      .order("created_at", { ascending: false })
      .limit(200);
    return { payouts: rows ?? [] };
  });

export const adminUpdatePayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payout_id: string; status: "approved" | "paid" | "rejected"; admin_note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    const { error } = await admin
      .from("varadhi_payout_requests")
      .update({
        status: data.status,
        admin_note: data.admin_note ?? null,
        processed_by: context.userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.payout_id);
    if (error) throw new Error(error.message);

    if (data.status === "paid") {
      await admin
        .from("varadhi_commissions")
        .update({ status: "paid" })
        .eq("payout_id", data.payout_id);
    }
    if (data.status === "rejected") {
      await admin
        .from("varadhi_commissions")
        .update({ status: "pending", payout_id: null })
        .eq("payout_id", data.payout_id);
    }
    return { ok: true };
  });

// -------- Admin: pick an existing registered user as partner
export const adminSearchPartnerCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; state?: string; district?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { assertVaradhiAdminClient } = await import("@/lib/varadhi-partner.server");
    const admin = await assertVaradhiAdminClient(context.userId, (context.claims as any)?.email);
    let q = admin
      .from("varadhi_profiles")
      .select("user_id, full_name, phone, state, district, mandal, city")
      .order("created_at", { ascending: false });
    if (data.state) q = q.eq("state", data.state);
    if (data.district) q = q.eq("district", data.district);
    if (data.q) q = q.or(`full_name.ilike.%${data.q}%,phone.ilike.%${data.q}%`);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

// -------- Area admin's own dashboard counts
export const getMyAreaAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: seat } = await supabaseAdmin
      .from("varadhi_area_admins")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!seat) return { seat: null };
    const s: any = seat;

    let pq = supabaseAdmin.from("varadhi_profiles").select("user_id").eq("state", s.state);
    if (s.district) pq = pq.eq("district", s.district);
    if (s.mandal) pq = pq.eq("mandal", s.mandal);
    const { data: profiles } = await pq.limit(5000);
    const ids = (profiles ?? []).map((p: any) => p.user_id);

    let listings = 0;
    let providers = 0;
    let subscriptions = 0;
    if (ids.length) {
      const [l, pr, sub] = await Promise.all([
        supabaseAdmin.from("varadhi_listings").select("id", { count: "exact", head: true }).in("user_id", ids),
        supabaseAdmin.from("varadhi_providers").select("id", { count: "exact", head: true }).in("user_id", ids),
        supabaseAdmin
          .from("varadhi_subscriptions")
          .select("id", { count: "exact", head: true })
          .in("user_id", ids)
          .eq("status", "active"),
      ]);
      listings = l.count ?? 0;
      providers = pr.count ?? 0;
      subscriptions = sub.count ?? 0;
    }
    return { seat: s, counts: { users: ids.length, listings, providers, subscriptions } };
  });
