import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-url";

// -------- Varadhi-only login (completely independent of MBR auth flow)
// mode: "link" sends a click-to-login magic link; "otp" sends a 6-digit code
// the user types on the Varadhi auth page.
export const sendVaradhiLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; mode?: "link" | "otp" }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const mode = data.mode ?? "link";
    if (!email) return { sent: false as const, reason: "missing_email" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure an auth user exists (Varadhi is open sign-up — anyone can register).
    let userId: string | null = null;
    for (let page = 1; page <= 20; page += 1) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x: any) => x.email?.toLowerCase() === email);
      if (u) { userId = u.id; break; }
      if (list.users.length < 1000) break;
    }
    if (!userId) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `VARADHI-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { app: "varadhi" },
      });
      if (createError) throw new Error(createError.message);
    }

    const redirectTo = `${PUBLIC_APP_ORIGIN}/varadhi/auth`;
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (linkErr) throw new Error(linkErr.message);
    const confirmationUrl = link?.properties?.action_link;
    const emailOtp = (link?.properties as any)?.email_otp as string | undefined;
    if (!confirmationUrl) throw new Error("Could not generate login link");
    if (mode === "otp" && !emailOtp) throw new Error("Could not generate OTP");

    const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
      import("@lovable.dev/email-js"),
      import("react"),
      import("react-email"),
      import("@/lib/email-templates/magic-link"),
    ]);
    const siteName = "Varadhi";
    const note = mode === "otp"
      ? `Your one-time code / OTP: ${emailOtp}\nమీ OTP కోడ్: ${emailOtp}`
      : undefined;
    const element = React.createElement(MagicLinkEmail, { siteName, confirmationUrl, note });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Email service is not configured");
    const messageId = crypto.randomUUID();
    await sendLovableEmail(
      {
        to: email,
        from: `${siteName} <noreply@notify.mbrplatform.com>`,
        sender_domain: "notify.mbrplatform.com",
        subject: mode === "otp" ? `Varadhi — Login code ${emailOtp}` : "Varadhi — Login link",
        html,
        text,
        purpose: "transactional",
        label: mode === "otp" ? "varadhi_otp" : "varadhi_magiclink",
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `varadhi-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId }
    );

    return { sent: true as const, mode };
  });

export type VaradhiProfile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  primary_role: "seller" | "buyer" | "provider";
  business_name: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  aadhaar_url: string | null;
  license_url: string | null;
  store_photo_url: string | null;
  verification_status: "pending" | "approved" | "rejected";
};

export type VaradhiListing = {
  id: string;
  seller_id: string;
  category: "fresh" | "new" | "used" | "realestate";
  sub_category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  images: string[];
  city: string | null;
  lat: number | null;
  lng: number | null;
  stock_status: "running" | "closed";
  stock_qty?: string | null;
  click_count: number;
  created_at: string;
  blood_group?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
};

export type VaradhiProvider = {
  id: string;
  user_id: string;
  provider_type: "transport" | "service";
  sub_type: string;
  title: string;
  description: string | null;
  vehicle_details: string | null;
  service_areas: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  availability_status: "online" | "offline";
  rating_avg: number;
  click_count: number;
  subscription_expires_at: string | null;
  contact_phone?: string | null;
  photo_url?: string | null;
  price_per_km?: number | string | null;
  location_full?: string | null;
};


// -------- Profile
export const getMyVaradhiProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("varadhi_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { profile: data as VaradhiProfile | null };
  });

export const upsertVaradhiProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<VaradhiProfile>) => d)
  .handler(async ({ data, context }) => {
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_profiles")
      .upsert(row as any, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { profile: out };
  });

// -------- Listings
export const listListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string; mine?: boolean } = {}) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("varadhi_listings").select("*").order("created_at", { ascending: false });
    if (data.mine) q = q.eq("seller_id", context.userId);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q.limit(200);
    if (error) throw new Error(error.message);
    return { listings: (rows ?? []) as VaradhiListing[] };
  });

export const getListing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: item, error } = await context.supabase
      .from("varadhi_listings").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) return { listing: null, seller: null, nearby: [] };
    const { data: seller } = await context.supabase
      .from("varadhi_profiles").select("*").eq("user_id", item.seller_id).maybeSingle();
    // Simple nearby transport: online providers within same city (fallback: all online transport)
    let nearbyQ = context.supabase
      .from("varadhi_providers").select("*")
      .eq("provider_type", "transport").eq("availability_status", "online").limit(10);
    if (item.city) nearbyQ = nearbyQ.eq("city", item.city);
    const { data: nearby } = await nearbyQ;
    return { listing: item as VaradhiListing, seller, nearby: (nearby ?? []) as VaradhiProvider[] };
  });

export const upsertListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<VaradhiListing> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const points = await import("@/lib/varadhi-points.server");
    await points.assertPointsAvailable(context.supabase, context.userId);
    const row = { ...data, seller_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_listings").upsert(row as any).select().single();
    if (error) throw new Error(error.message);
    await points.awardPoint(context.supabase, context.userId, "upload", "listing", (out as any)?.id);
    return { listing: out };
  });

export const toggleListingStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "running" | "closed" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("varadhi_listings").update({ stock_status: data.status })
      .eq("id", data.id).eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("varadhi_listings").delete().eq("id", data.id).eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logClick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { target_type: "listing" | "provider"; target_id: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.rpc("varadhi_log_click" as any, {
      _target_type: data.target_type, _target_id: data.target_id,
    });
    // Contact-open costs the post owner one point (not the viewer).
    const table = data.target_type === "listing" ? "varadhi_listings" : "varadhi_providers";
    const col = data.target_type === "listing" ? "seller_id" : "user_id";
    const { data: owner } = await context.supabase
      .from(table as any).select(col).eq("id", data.target_id).maybeSingle();
    const ownerId = (owner as any)?.[col] as string | undefined;
    if (ownerId && ownerId !== context.userId) {
      const points = await import("@/lib/varadhi-points.server");
      await points.awardPoint(context.supabase, ownerId, "contact", data.target_type, data.target_id);
    }
    return { ok: true };
  });


// -------- Providers
export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider_type?: string; sub_type?: string; mine?: boolean } = {}) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("varadhi_providers").select("*").order("created_at", { ascending: false });
    if (data.mine) q = q.eq("user_id", context.userId);
    if (data.provider_type) q = q.eq("provider_type", data.provider_type);
    if (data.sub_type) q = q.eq("sub_type", data.sub_type);
    const { data: rows, error } = await q.limit(200);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as VaradhiProvider[];
    const ids = [...new Set(list.map((p) => p.user_id))];
    let byUser = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("varadhi_profiles")
        .select("user_id, village, mandal, district, state, pincode")
        .in("user_id", ids);
      byUser = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    }
    return {
      providers: list.map((p) => {
        const pr = byUser.get(p.user_id);
        const parts = [pr?.village || p.city, pr?.mandal, pr?.district, pr?.state].filter(Boolean);
        return {
          ...p,
          location_full: parts.join(", ") + (pr?.pincode ? ` - ${pr.pincode}` : ""),
        };
      }) as VaradhiProvider[],
    };
  });


export const upsertProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<VaradhiProvider> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const points = await import("@/lib/varadhi-points.server");
    await points.assertPointsAvailable(context.supabase, context.userId);
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_providers").upsert(row as any).select().single();
    if (error) throw new Error(error.message);
    await points.awardPoint(context.supabase, context.userId, "upload", "provider", (out as any)?.id);
    return { provider: out };
  });

export const toggleProviderAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "online" | "offline" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("varadhi_providers").update({ availability_status: data.status })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Subscriptions
const PLAN_DAYS: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
const PLAN_AMOUNT: Record<string, number> = { "1m": 300, "3m": 800, "6m": 1500, "1y": 2500 };

export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("varadhi_subscriptions").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    return { subscriptions: data ?? [] };
  });

export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: "1m" | "3m" | "6m" | "1y" }) => d)
  .handler(async ({ data, context }) => {
    const days = PLAN_DAYS[data.plan];
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { data: sub, error } = await context.supabase
      .from("varadhi_subscriptions").insert({
        user_id: context.userId,
        plan: data.plan,
        amount: PLAN_AMOUNT[data.plan],
        expires_at: expires,
        status: "pending",
      }).select().single();
    if (error) throw new Error(error.message);
    return { subscription: sub };
  });

// -------- Rewards
export const getMyRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("varadhi_rewards").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    const total = (data ?? []).reduce((s, r: any) => s + (r.points || 0), 0);
    return { rewards: data ?? [], total };
  });

// -------- Upload helper (signed URL for private buckets)
// Listing photos live in private buckets; anyone browsing Vaaradhi needs to see
// them, so we sign the path server-side. Restricted to listing image paths only.
export const resolveListingImage = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const path = (data.path ?? "").trim();
    if (!path || path.startsWith("http")) return { url: path || null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const bucket of ["varadhi-listings", "varadhi-proofs"]) {
      if (bucket === "varadhi-proofs" && !path.includes("listing-")) continue;
      const { data: s } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
      if (s?.signedUrl) return { url: s.signedUrl };
    }
    return { url: null };
  });

export const getSignedListingUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed } = await context.supabase.storage
      .from("varadhi-listings").createSignedUrl(data.path, 60 * 60);
    return { url: signed?.signedUrl ?? null };
  });

// -------- Admin: Varadhi has its OWN super admin role (varadhi_admin),
// completely independent from the MBR super admin (mbr_admin).
// Bootstrap emails automatically receive the role on first admin visit.
const VARADHI_BOOTSTRAP_ADMINS = ["mbrvaradhi@yahoo.com", "mbrproduct@gmail.com"];

async function assertVaradhiAdmin(_supabase: any, userId: string, email?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "varadhi_admin")
    .maybeSingle();
  if (roleRow) return;

  let mail = (email ?? "").trim().toLowerCase();
  if (!mail) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    mail = (u?.user?.email ?? "").trim().toLowerCase();
  }
  if (mail && VARADHI_BOOTSTRAP_ADMINS.includes(mail)) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "varadhi_admin" });
    return;
  }
  throw new Error("Forbidden: Varadhi Admin only");
}


// Lightweight check the admin page uses to decide what to render.
export const amIVaradhiAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });

export const adminListVaradhiProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending" | "approved" | "rejected" | "all" } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("varadhi_profiles").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("verification_status", data.status);
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);

    // Sign private proof URLs so admin can view them.
    async function sign(bucket: string, path: string | null) {
      if (!path) return null;
      const p = path.includes("/") ? path : path;
      const { data: s } = await supabaseAdmin.storage.from(bucket).createSignedUrl(p, 60 * 60);
      return s?.signedUrl ?? null;
    }
    const enriched = await Promise.all((rows ?? []).map(async (r: any) => ({
      ...r,
      aadhaar_signed_url: await sign("varadhi-proofs", r.aadhaar_url),
      license_signed_url: await sign("varadhi-proofs", r.license_url),
      store_photo_signed_url: await sign("varadhi-proofs", r.store_photo_url),
      vehicle_photo_signed_url: await sign("varadhi-proofs", r.vehicle_photo_url),
      photo_signed_url: await sign("varadhi-proofs", r.photo_url),
    })));
    return { profiles: enriched };
  });

export const adminReviewVaradhiProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; action: "approve" | "reject"; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("varadhi_profiles")
      .update({
        verification_status: data.action === "approve" ? "approved" : "rejected",
        verification_notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Points / free monthly quota
export const getMyPointStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const points = await import("@/lib/varadhi-points.server");
    const status = await points.getPointStatus(context.supabase, context.userId);
    const { data: events } = await context.supabase
      .from("varadhi_point_events").select("*")
      .eq("user_id", context.userId)
      .gte("created_at", points.monthStartIso())
      .order("created_at", { ascending: false }).limit(100);
    return { status, events: events ?? [] };
  });

export const adminGetPointSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("varadhi_point_settings").select("*").eq("id", 1).maybeSingle();
    return { settings: data ?? { free_monthly_points: 10, enforce_limit: true } };
  });

export const adminUpdatePointSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { free_monthly_points: number; enforce_limit: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("varadhi_point_settings").upsert({
      id: 1,
      free_monthly_points: Math.max(0, Math.min(1000, Math.round(data.free_monthly_points))),
      enforce_limit: !!data.enforce_limit,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPointsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { state?: string; district?: string; mandal?: string; q?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pts = await import("@/lib/varadhi-points.server");
    const since = pts.monthStartIso();

    const { data: settings } = await supabaseAdmin
      .from("varadhi_point_settings").select("*").eq("id", 1).maybeSingle();
    const freeLimit = (settings as any)?.free_monthly_points ?? 10;

    // Every registered Vaaradhi user (area filters applied server-side).
    let pq = supabaseAdmin
      .from("varadhi_profiles")
      .select("user_id, full_name, phone, primary_role, village, mandal, district, state, verification_status")
      .limit(2000);
    if (data.state) pq = pq.eq("state", data.state);
    if (data.district) pq = pq.eq("district", data.district);
    if (data.mandal) pq = pq.eq("mandal", data.mandal);
    if (data.q) pq = pq.or(`full_name.ilike.%${data.q}%,phone.ilike.%${data.q}%`);
    const { data: profs } = await pq;
    const profiles = (profs ?? []) as any[];
    const ids = profiles.map((p) => p.user_id);

    const agg = new Map<string, { used: number; upload: number; contact: number; last: string | null }>();
    const allTime = new Map<string, number>();
    if (ids.length) {
      const { data: events } = await supabaseAdmin
        .from("varadhi_point_events").select("user_id, points, event_type, created_at")
        .in("user_id", ids).limit(20000);
      for (const e of (events ?? []) as any[]) {
        allTime.set(e.user_id, (allTime.get(e.user_id) ?? 0) + (e.points || 0));
        if (e.created_at < since) continue;
        const cur = agg.get(e.user_id) ?? { used: 0, upload: 0, contact: 0, last: e.created_at };
        cur.used += e.points || 0;
        if (e.event_type === "upload") cur.upload += e.points || 0;
        else cur.contact += e.points || 0;
        if (!cur.last || e.created_at > cur.last) cur.last = e.created_at;
        agg.set(e.user_id, cur);
      }
    }

    let subs = new Map<string, any>();
    if (ids.length) {
      const { data: srows } = await supabaseAdmin
        .from("varadhi_subscriptions").select("user_id, plan, status, expires_at")
        .in("user_id", ids).eq("status", "active").gt("expires_at", new Date().toISOString());
      subs = new Map((srows ?? []).map((s: any) => [s.user_id, s]));
    }

    const rows = profiles.map((p) => {
      const a = agg.get(p.user_id) ?? { used: 0, upload: 0, contact: 0, last: null };
      const sub = subs.get(p.user_id);
      return {
        user_id: p.user_id,
        ...a,
        total_all_time: allTime.get(p.user_id) ?? 0,
        remaining: Math.max(0, freeLimit - a.used),
        over_limit: a.used >= freeLimit,
        subscribed: !!sub,
        subscription: sub ?? null,
        profile: p,
      };
    }).sort((x, y) => y.used - x.used || (x.profile.full_name ?? "").localeCompare(y.profile.full_name ?? ""));

    // Distinct area values for filter dropdowns (unfiltered by mandal/district).
    const { data: areaRows } = await supabaseAdmin
      .from("varadhi_profiles").select("state, district, mandal").limit(5000);
    const areas = { states: new Set<string>(), districts: new Set<string>(), mandals: new Set<string>() };
    for (const r of (areaRows ?? []) as any[]) {
      if (r.state) areas.states.add(r.state);
      if (r.district && (!data.state || r.state === data.state)) areas.districts.add(r.district);
      if (r.mandal && (!data.state || r.state === data.state) && (!data.district || r.district === data.district)) {
        areas.mandals.add(r.mandal);
      }
    }

    return {
      free_limit: freeLimit,
      enforce_limit: (settings as any)?.enforce_limit ?? true,
      month_start: since,
      total_points: rows.reduce((s, r) => s + r.used, 0),
      rows,
      areas: {
        states: [...areas.states].sort(),
        districts: [...areas.districts].sort(),
        mandals: [...areas.mandals].sort(),
      },
    };
  });

export const adminUserPointHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: events } = await supabaseAdmin
      .from("varadhi_point_events")
      .select("id, points, event_type, ref_type, ref_id, note, created_at")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (events ?? []) as any[];

    const listingIds = rows.filter((r) => r.ref_type === "listing" && r.ref_id).map((r) => r.ref_id);
    const providerIds = rows.filter((r) => r.ref_type === "provider" && r.ref_id).map((r) => r.ref_id);
    const titles = new Map<string, string>();
    if (listingIds.length) {
      const { data: l } = await supabaseAdmin.from("varadhi_listings").select("id, title").in("id", listingIds);
      for (const x of (l ?? []) as any[]) titles.set(x.id, x.title);
    }
    if (providerIds.length) {
      const { data: p } = await supabaseAdmin.from("varadhi_providers").select("id, title").in("id", providerIds);
      for (const x of (p ?? []) as any[]) titles.set(x.id, x.title);
    }

    return {
      events: rows.map((r) => ({ ...r, ref_title: r.ref_id ? (titles.get(r.ref_id) ?? null) : null })),
      total: rows.reduce((s, r) => s + (r.points || 0), 0),
    };
  });

