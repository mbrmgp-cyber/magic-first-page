import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-url";

// -------- Varadhi-only login (completely independent of MBR auth flow)
export const sendVaradhiLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
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
    if (!confirmationUrl) throw new Error("Could not generate login link");

    const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
      import("@lovable.dev/email-js"),
      import("react"),
      import("react-email"),
      import("@/lib/email-templates/magic-link"),
    ]);
    const siteName = "Varadhi";
    const element = React.createElement(MagicLinkEmail, { siteName, confirmationUrl });
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
        subject: "Varadhi — Login link",
        html,
        text,
        purpose: "transactional",
        label: "varadhi_magiclink",
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `varadhi-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId }
    );

    return { sent: true as const };
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
  click_count: number;
  created_at: string;
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
    const row = { ...data, seller_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_listings").upsert(row as any).select().single();
    if (error) throw new Error(error.message);
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
    return { providers: (rows ?? []) as VaradhiProvider[] };
  });

export const upsertProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<VaradhiProvider> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const row = { ...data, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_providers").upsert(row as any).select().single();
    if (error) throw new Error(error.message);
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
export const getSignedListingUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed } = await context.supabase.storage
      .from("varadhi-listings").createSignedUrl(data.path, 60 * 60);
    return { url: signed?.signedUrl ?? null };
  });
