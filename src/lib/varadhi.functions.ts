import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-url";
import { VARADHI_APP_URL } from "@/lib/app-hosts";
import { VARADHI_PROFILE_SAFE_COLUMNS, VARADHI_LISTING_SAFE_COLUMNS } from "@/lib/db-columns";
import { profileEditSchema, adminProfileEditSchema, isProfileLocked } from "@/lib/varadhi-profile";
import { appointmentSearchArea } from "@/lib/varadhi-appointments";

// -------- Varadhi-only login (completely independent of MBR auth flow)
// mode: "link" sends a click-to-login magic link; "otp" sends a 6-digit code
// the user types on the Varadhi auth page.
export const sendVaradhiLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; mode?: "link" | "otp" }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const mode = "otp" as const;
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

    const redirectTo = `${VARADHI_APP_URL}/auth`;
    // No magic links: only generate the one-time code, email points to the login page.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (linkErr) throw new Error(linkErr.message);
    const confirmationUrl = redirectTo;
    const emailOtp = (link?.properties as any)?.email_otp as string | undefined;
    if (!emailOtp) throw new Error("Could not generate OTP");


    const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
      import("@lovable.dev/email-js"),
      import("react"),
      import("react-email"),
      import("@/lib/email-templates/magic-link"),
    ]);
    const siteName = "VAARADHI APP";
    const otpLength = emailOtp?.length ?? 6;
    const note = `Your ${otpLength}-digit one-time code / OTP: ${emailOtp}\nమీ ${otpLength} అంకెల OTP కోడ్: ${emailOtp}`;
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
        subject: mode === "otp" ? `VAARADHI APP — Login code ${emailOtp}` : "VAARADHI APP — Login link",
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

    return { sent: true as const, mode, otpLength };
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
      .select(VARADHI_PROFILE_SAFE_COLUMNS as "*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { profile: data as VaradhiProfile | null };
  });

// Columns a user is allowed to change on their own profile. Admin-only fields
// (verification_status / verification_notes) are deliberately excluded so a
// user can never self-issue the "verified" badge.
const VARADHI_PROFILE_USER_EDITABLE = [
  "full_name", "phone", "primary_role", "business_name", "address", "city",
  "lat", "lng", "store_photo_url", "photo_url", "aadhaar_url", "license_url",
  "mandal", "district", "state", "provider_sub_type", "vehicle_photo_url",
  "experience_years", "certificates_urls", "provider_specialty", "address_type",
  "house_number", "shop_name", "occupation", "referral_code_used",
  "referred_partner_id",
] as const;

export const upsertVaradhiProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileEditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: current, error: readError } = await context.supabase.from("varadhi_profiles").select("verification_status").eq("user_id", context.userId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (isProfileLocked(current?.verification_status)) throw new Error("Approved profiles can only be edited from the admin panel");
    const clean: Record<string, unknown> = {};
    for (const k of VARADHI_PROFILE_USER_EDITABLE) {
      if (k in (data as Record<string, unknown>)) clean[k] = (data as Record<string, unknown>)[k];
    }
    const row = { ...clean, user_id: context.userId };
    const { data: out, error } = await context.supabase
      .from("varadhi_profiles")
      .upsert(row as any, { onConflict: "user_id" })
      .select(VARADHI_PROFILE_SAFE_COLUMNS as "*")
      .single();
    if (error) throw new Error(error.message);
    return { profile: out };
  });

export const adminEditVaradhiProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminProfileEditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase.rpc("varadhi_admin_edit_profile" as any, { _user_id: data.user_id, _changes: data.changes } as any);
    if (error) throw new Error(error.message);
    return { profile };
  });


// -------- Listings
export const listListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string; mine?: boolean } = {}) => d)
  .handler(async ({ data, context }) => {
    if (data.mine) {
      // Owners may see their own private fields (street address, contact phone).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: removed, error: removalError } = await context.supabase.from("varadhi_post_removals").select("target_id").eq("target_type", "listing").eq("owner_id", context.userId);
      if (removalError) throw new Error(removalError.message);
      let mq = supabaseAdmin
        .from("varadhi_listings").select("*")
        .eq("seller_id", context.userId)
        .order("created_at", { ascending: false });
      if (data.category) mq = mq.eq("category", data.category);
      if (removed?.length) mq = mq.not("id", "in", `(${removed.map(r => r.target_id).join(",")})`);
      const { data: mine, error: mineErr } = await mq.limit(200);
      if (mineErr) throw new Error(mineErr.message);
      return { listings: (mine ?? []) as VaradhiListing[] };
    }
    let q = context.supabase
      .from("varadhi_listings")
      .select(VARADHI_LISTING_SAFE_COLUMNS as "*")
      .order("created_at", { ascending: false });
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
      .from("varadhi_listings").select(VARADHI_LISTING_SAFE_COLUMNS as "*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) return { listing: null, seller: null, nearby: [] };
    const { data: seller } = await context.supabase
      .from("varadhi_profiles").select(VARADHI_PROFILE_SAFE_COLUMNS as "*").eq("user_id", item.seller_id).maybeSingle();

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
      .from("varadhi_listings").upsert(row as any).select(VARADHI_LISTING_SAFE_COLUMNS as "*").single();
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

// Quick inventory edit from the Update Board (stock quantity / price only).
export const updateListingInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; stock_qty?: string | null; price?: number | null }) => d)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.stock_qty !== undefined) patch.stock_qty = data.stock_qty;
    if (data.price !== undefined) patch.price = data.price;
    const { error } = await context.supabase
      .from("varadhi_listings").update(patch as any)
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
    // Only the public listing-photo bucket; private proof documents are never signed here.
    if (path.includes("..")) return { url: null };
    const { data: s } = await supabaseAdmin.storage.from("varadhi-listings").createSignedUrl(path, 60 * 60 * 6);
    return { url: s?.signedUrl ?? null };
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
const VARADHI_BOOTSTRAP_ADMINS = ["mbrvaradhi@yahoo.com", "mbrplatform@gmail.com"];

async function assertVaradhiAdmin(_supabase: any, userId: string, email?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "varadhi_admin")
    .maybeSingle();
  if (roleRow) return;

  void email;
  // Only trust the stored, confirmed email — never a caller-supplied one.
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  const mail = u?.user?.email_confirmed_at ? (u.user.email ?? "").trim().toLowerCase() : "";
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
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.level) throw new Error("Forbidden: Varadhi Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("varadhi_profiles").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("verification_status", data.status);
    // Scope strictly to the admin's own area: state < district < mandal.
    if (!scope.isSuper && scope.state) q = q.eq("state", scope.state);
    if (!scope.isSuper && scope.district && scope.level !== "state_admin") q = q.eq("district", scope.district);
    if (!scope.isSuper && scope.level === "mandal_admin" && scope.mandal) q = q.eq("mandal", scope.mandal);
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
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.level) throw new Error("Forbidden: Varadhi Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!scope.isSuper) {
      const { data: target } = await supabaseAdmin
        .from("varadhi_profiles").select("state, district, mandal").eq("user_id", data.user_id).maybeSingle();
      const t = (target ?? {}) as any;
      if (scope.state && t.state !== scope.state) throw new Error("మీ ప్రాంతం కాదు");
      if (scope.level !== "state_admin" && scope.district && t.district !== scope.district) {
        throw new Error("మీ జిల్లా కాదు");
      }
      if (scope.level === "mandal_admin" && scope.mandal && t.mandal !== scope.mandal) {
        throw new Error("మీ మండలం కాదు");
      }
    }

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
    const pqTerm = (data.q ?? "").replace(/[(),."\\%]/g, "").trim().slice(0, 80);
    if (pqTerm) pq = pq.or(`full_name.ilike.%${pqTerm}%,phone.ilike.%${pqTerm}%`);
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


// -------- Admin hierarchy: Super Admin → State Admin → District Admin --------

async function isSuperVaradhiAdmin(userId: string, email?: string | null) {
  try {
    await assertVaradhiAdmin(null, userId, email);
    return true;
  } catch {
    return false;
  }
}

async function loadAreaScope(userId: string, email?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const isSuper = await isSuperVaradhiAdmin(userId, email);
  const { data: seats } = await supabaseAdmin
    .from("varadhi_area_admins")
    .select("id, level, state, district, mandal, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);
  const rows = (seats ?? []) as any[];
  const state = rows.find((r) => r.level === "state_admin") ?? null;
  const district = rows.find((r) => r.level === "district_admin") ?? null;
  const mandal = rows.find((r) => r.level === "mandal_admin") ?? null;
  return {
    isSuper,
    level: (isSuper
      ? "super_admin"
      : state ? "state_admin"
      : district ? "district_admin"
      : mandal ? "mandal_admin"
      : null) as "super_admin" | "state_admin" | "district_admin" | "mandal_admin" | null,
    state: (state?.state ?? district?.state ?? mandal?.state ?? null) as string | null,
    district: (district?.district ?? mandal?.district ?? null) as string | null,
    mandal: (mandal?.mandal ?? null) as string | null,
    seats: rows,
  };
}

// Any signed-in user can read their own scope; the panel renders from this.
export const getMyVaradhiScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    return { ...scope, canOpenPanel: scope.level !== null };
  });

export const submitVaradhiAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    full_name: string; phone?: string; requested_level: "state_admin" | "district_admin" | "mandal_admin";
    state: string; district?: string; mandal?: string; message?: string;
    photo_url?: string; aadhaar_url?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const name = (data.full_name ?? "").trim();
    if (name.length < 2 || name.length > 100) throw new Error("పేరు సరిగా ఇవ్వండి");
    if (!data.state) throw new Error("రాష్ట్రం ఎంచుకోండి");
    if (data.requested_level !== "state_admin" && !data.district) throw new Error("జిల్లా ఎంచుకోండి");
    if (data.requested_level === "mandal_admin" && !(data.mandal ?? "").trim()) throw new Error("మండలం ఇవ్వండి");
    if (!(data.photo_url ?? "").trim()) throw new Error("ఫోటో అప్‌లోడ్ చేయండి");
    if (!(data.aadhaar_url ?? "").trim()) throw new Error("ఆధార్ కార్డు అప్‌లోడ్ చేయండి");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending } = await supabaseAdmin
      .from("varadhi_admin_requests")
      .select("id").eq("user_id", context.userId).eq("status", "pending").maybeSingle();
    if (pending) throw new Error("మీ దరఖాస్తు ఇప్పటికే పరిశీలనలో ఉంది");
    const { error } = await supabaseAdmin.from("varadhi_admin_requests").insert({
      user_id: context.userId,
      full_name: name,
      phone: (data.phone ?? "").trim().slice(0, 20) || null,
      email: ((context.claims as any)?.email ?? null),
      requested_level: data.requested_level,
      state: data.state,
      district: data.district ?? null,
      mandal: data.requested_level === "mandal_admin" ? (data.mandal ?? "").trim() : ((data.mandal ?? "").trim() || null),
      message: (data.message ?? "").trim().slice(0, 1000) || null,
      photo_url: (data.photo_url ?? "").trim() || null,
      aadhaar_url: (data.aadhaar_url ?? "").trim() || null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myVaradhiAdminRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("varadhi_admin_requests")
      .select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { requests: data ?? [] };
  });

export const adminListAdminRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending" | "approved" | "rejected" | "all" } = {}) => d)
  .handler(async ({ data, context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.isSuper && scope.level !== "state_admin") throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("varadhi_admin_requests").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (!scope.isSuper && scope.state) q = q.eq("state", scope.state);
    const { data: rows, error } = await q.limit(300);
    if (error) throw new Error(error.message);

    const sign = async (path?: string | null) => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data: s } = await supabaseAdmin.storage
        .from("varadhi-proofs").createSignedUrl(path, 60 * 60 * 6);
      return s?.signedUrl ?? null;
    };
    const requests = await Promise.all((rows ?? []).map(async (r: any) => ({
      ...r,
      photo_signed_url: await sign(r.photo_url),
      aadhaar_signed_url: await sign(r.aadhaar_url),
    })));

    return { requests, canApprove: scope.isSuper };
  });

// Only the Super Admin can approve / reject and thereby create an area seat.
export const adminReviewAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    request_id: string; action: "approve" | "reject"; notes?: string;
    grant_level?: "state_admin" | "district_admin" | "mandal_admin";
    parent_admin_id?: string | null; mandal?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin
      .from("varadhi_admin_requests").select("*").eq("id", data.request_id).maybeSingle();
    if (!req) throw new Error("దరఖాస్తు కనిపించలేదు");
    if ((req as any).status !== "pending") throw new Error("ఇప్పటికే పరిష్కరించబడింది");

    let grantedLevel: string | null = null;
    let grantedMandal: string | null = null;
    if (data.action === "approve") {
      const level = data.grant_level ?? (req as any).requested_level;
      const mandal = (data.mandal ?? (req as any).mandal ?? "") || null;
      grantedLevel = level;
      grantedMandal = level === "mandal_admin" ? mandal : null;
      if (level !== "state_admin" && !(req as any).district) throw new Error("జిల్లా లేదు");
      if (level === "mandal_admin" && !mandal) throw new Error("మండలం లేదు");
      const { error: seatErr } = await supabaseAdmin.from("varadhi_area_admins").insert({
        user_id: (req as any).user_id,
        level,
        state: (req as any).state,
        district: level === "state_admin" ? null : (req as any).district,
        mandal: level === "mandal_admin" ? mandal : null,
        parent_admin_id: level === "state_admin" ? null : (data.parent_admin_id ?? null),
        assigned_by: context.userId,
      } as any);
      if (seatErr && !seatErr.message.includes("duplicate")) throw new Error(seatErr.message);
    }

    const { error } = await supabaseAdmin.from("varadhi_admin_requests").update({
      status: data.action === "approve" ? "approved" : "rejected",
      review_notes: (data.notes ?? "").slice(0, 500) || null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.request_id);
    if (error) throw new Error(error.message);

    const { logAdminAudit } = await import("@/lib/varadhi-audit.server");
    await logAdminAudit({
      action: data.action === "approve" ? "request_approved" : "request_rejected",
      actor_user_id: context.userId,
      request_id: data.request_id,
      target_user_id: (req as any).user_id,
      state: (req as any).state,
      district: (req as any).district,
      mandal: grantedMandal ?? (req as any).mandal ?? null,
      before_data: { status: (req as any).status, requested_level: (req as any).requested_level },
      after_data: {
        status: data.action === "approve" ? "approved" : "rejected",
        granted_level: grantedLevel,
        parent_admin_id: data.parent_admin_id ?? null,
      },
      notes: data.notes ?? null,
    });
    return { ok: true };
  });


export const adminListAreaAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.level) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("varadhi_area_admins").select("*").order("created_at", { ascending: false });
    if (!scope.isSuper && scope.state) q = q.eq("state", scope.state);
    if (!scope.isSuper && scope.district && scope.level !== "state_admin") q = q.eq("district", scope.district);
    if (!scope.isSuper && scope.level === "mandal_admin" && scope.mandal) q = q.eq("mandal", scope.mandal);
    const { data: rows } = await q.limit(500);
    const list = (rows ?? []) as any[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const profiles = new Map<string, any>();
    if (ids.length) {
      const { data: p } = await supabaseAdmin
        .from("varadhi_profiles").select("user_id, full_name, phone, city, mandal, district, state").in("user_id", ids);
      for (const x of (p ?? []) as any[]) profiles.set(x.user_id, x);
    }
    return {
      admins: list.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null, canAppoint: r.is_active && r.level === "district_admin" && (scope.isSuper || r.user_id === context.userId) })),
      isSuper: scope.isSuper,
      scope: { level: scope.level, state: scope.state, district: scope.district, mandal: scope.mandal },
    };
  });

// Super Admin assigns a District Admin under a chosen State Admin.
export const adminAssignDistrictAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; state: string; district: string; parent_admin_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    if (!data.user_id || !data.state || !data.district) throw new Error("వివరాలు అసంపూర్ణం");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.parent_admin_id) {
      const { data: parent } = await supabaseAdmin
        .from("varadhi_area_admins").select("id, level, state").eq("id", data.parent_admin_id).maybeSingle();
      if (!parent || (parent as any).level !== "state_admin" || (parent as any).state !== data.state) {
        throw new Error("ఎంచుకున్న రాష్ట్ర అడ్మిన్ ఈ రాష్ట్రానికి చెందినవారు కాదు");
      }
    }
    const { error } = await supabaseAdmin.from("varadhi_area_admins").insert({
      user_id: data.user_id,
      level: "district_admin",
      state: data.state,
      district: data.district,
      parent_admin_id: data.parent_admin_id ?? null,
      assigned_by: context.userId,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "ఇప్పటికే కేటాయించబడింది" : error.message);
    const { logAdminAudit } = await import("@/lib/varadhi-audit.server");
    await logAdminAudit({
      action: "district_admin_assigned",
      actor_user_id: context.userId,
      target_user_id: data.user_id,
      state: data.state,
      district: data.district,
      after_data: { level: "district_admin", parent_admin_id: data.parent_admin_id ?? null },
    });
    return { ok: true };
  });

export const adminSetAreaAdminActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("varadhi_area_admins").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin
      .from("varadhi_area_admins").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAdminAudit } = await import("@/lib/varadhi-audit.server");
    await logAdminAudit({
      action: data.is_active ? "seat_activated" : "seat_deactivated",
      actor_user_id: context.userId,
      seat_id: data.id,
      target_user_id: (before as any)?.user_id ?? null,
      state: (before as any)?.state ?? null,
      district: (before as any)?.district ?? null,
      mandal: (before as any)?.mandal ?? null,
      before_data: { is_active: (before as any)?.is_active ?? null },
      after_data: { is_active: data.is_active },
    });
    return { ok: true };
  });


// Approved candidates only; district admins may search their active districts.
export const adminSearchVaradhiUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; state?: string; district?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "varadhi_admin" });
    if (roleError) throw new Error(roleError.message);
    const { data: seats, error: seatsError } = await context.supabase.from("varadhi_area_admins").select("id, user_id, level, state, district, is_active").eq("user_id", context.userId).eq("is_active", true);
    if (seatsError) throw new Error(seatsError.message);
    const area = appointmentSearchArea(!!role, seats ?? [], data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("varadhi_profiles")
      .select("user_id, full_name, phone, state, district, mandal, city")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false });
    if (area.state) q = q.eq("state", area.state);
    if (area.district) q = q.eq("district", area.district);
    const qTerm = (data.q ?? "").replace(/[(),."\\%]/g, "").trim().slice(0, 80);
    if (qTerm) q = q.or(`full_name.ilike.%${qTerm}%,phone.ilike.%${qTerm}%`);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

// Active district owners and super admins appoint through an atomic authorized RPC.
export const adminAssignMandalAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; state: string; district: string; mandal: string; parent_admin_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("varadhi_appoint_mandal_admin", {
      _user_id: data.user_id, _state: data.state, _district: data.district,
      _mandal: data.mandal, _parent_admin_id: data.parent_admin_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// Mandal suggestions for a district, gathered from live profiles + listings.
export const adminListMandalOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { state?: string; district?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "varadhi_admin" });
    if (roleError) throw new Error(roleError.message);
    const { data: seats, error: seatsError } = await context.supabase.from("varadhi_area_admins").select("id, user_id, level, state, district, is_active").eq("user_id", context.userId).eq("is_active", true);
    if (seatsError) throw new Error(seatsError.message);
    const area = appointmentSearchArea(!!role, seats ?? [], data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out = new Set<string>();
    let pq = supabaseAdmin.from("varadhi_profiles").select("mandal").not("mandal", "is", null);
    if (area.state) pq = pq.eq("state", area.state);
    if (area.district) pq = pq.eq("district", area.district);
    const { data: p } = await pq.limit(1000);
    for (const r of (p ?? []) as any[]) if (r.mandal?.trim()) out.add(r.mandal.trim());

    let lq = supabaseAdmin.from("varadhi_listings").select("mandal").not("mandal", "is", null);
    if (area.state) lq = lq.eq("state", area.state);
    if (area.district) lq = lq.eq("district", area.district);
    const { data: l } = await lq.limit(1000);
    for (const r of (l ?? []) as any[]) if (r.mandal?.trim()) out.add(r.mandal.trim());

    return { mandals: Array.from(out).sort((a, b) => a.localeCompare(b)) };
  });

// Super Admin edits an existing area seat: change level / district / mandal / parent.
export const adminUpdateAreaSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    user_id: string;
    state: string;
    level: "state_admin" | "district_admin" | "mandal_admin";
    district?: string | null;
    mandal?: string | null;
    parent_admin_id?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    if (!data.user_id || !data.state) throw new Error("వివరాలు అసంపూర్ణం");
    if (data.level !== "state_admin" && !data.district) throw new Error("జిల్లా ఎంచుకోండి");
    if (data.level === "mandal_admin" && !(data.mandal ?? "").trim()) throw new Error("మండలం ఇవ్వండి");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.level !== "state_admin" && data.parent_admin_id) {
      const wantParent = data.level === "district_admin" ? "state_admin" : "district_admin";
      const { data: parent } = await supabaseAdmin
        .from("varadhi_area_admins").select("id, level, state, district").eq("id", data.parent_admin_id).maybeSingle();
      if (!parent || (parent as any).level !== wantParent || (parent as any).state !== data.state) {
        throw new Error("ఎంచుకున్న పై అడ్మిన్ సరిపోలడం లేదు");
      }
      if (wantParent === "district_admin" && (parent as any).district !== data.district) {
        throw new Error("ఎంచుకున్న జిల్లా అడ్మిన్ ఈ జిల్లాకు చెందినవారు కాదు");
      }
    }

    const patch = {
      level: data.level,
      state: data.state,
      district: data.level === "state_admin" ? null : data.district,
      mandal: data.level === "mandal_admin" ? (data.mandal ?? "").trim() : null,
      parent_admin_id: data.level === "state_admin" ? null : (data.parent_admin_id ?? null),
      is_active: true,
      assigned_by: context.userId,
    };

    const { data: existing } = await supabaseAdmin
      .from("varadhi_area_admins").select("*").eq("user_id", data.user_id).limit(1).maybeSingle();

    let seatId: string | null = (existing as any)?.id ?? null;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("varadhi_area_admins").update(patch as any).eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("varadhi_area_admins").insert({ user_id: data.user_id, ...patch } as any)
        .select("id").maybeSingle();
      if (error) throw new Error(error.message);
      seatId = (created as any)?.id ?? null;
    }

    const { logAdminAudit } = await import("@/lib/varadhi-audit.server");
    await logAdminAudit({
      action: existing ? "seat_reassigned" : "seat_created",
      actor_user_id: context.userId,
      seat_id: seatId,
      target_user_id: data.user_id,
      state: patch.state,
      district: patch.district ?? null,
      mandal: patch.mandal ?? null,
      before_data: existing
        ? {
            level: (existing as any).level,
            state: (existing as any).state,
            district: (existing as any).district,
            mandal: (existing as any).mandal,
            parent_admin_id: (existing as any).parent_admin_id,
            is_active: (existing as any).is_active,
          }
        : null,
      after_data: patch,
    });
    return { ok: true };
  });


// -------- Subscription receipt (Super Admin + District Admin signatures)
export const getSubscriptionReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscription_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: sub, error } = await context.supabase
      .from("varadhi_subscriptions").select("*").eq("id", data.subscription_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("సబ్‌స్క్రిప్షన్ కనిపించలేదు");

    const { data: profile } = await context.supabase
      .from("varadhi_profiles")
      .select("full_name, phone, state, district, mandal, city, address")
      .eq("user_id", context.userId).maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let districtAdminName: string | null = null;
    const p: any = profile ?? {};
    if (p.state && p.district) {
      const { data: seats } = await supabaseAdmin
        .from("varadhi_area_admins")
        .select("user_id, level, state, district, is_active")
        .eq("level", "district_admin").eq("state", p.state).eq("district", p.district)
        .eq("is_active", true).limit(1);
      const seat = (seats ?? [])[0] as any;
      if (seat) {
        const { data: dp } = await supabaseAdmin
          .from("varadhi_profiles").select("full_name").eq("user_id", seat.user_id).maybeSingle();
        districtAdminName = (dp as any)?.full_name ?? null;
      }
    }

    const receiptNo = `VRD-${String((sub as any).id).slice(0, 8).toUpperCase()}`;
    return {
      receipt: {
        receipt_no: receiptNo,
        plan: (sub as any).plan,
        amount: Number((sub as any).amount ?? 0),
        status: (sub as any).status,
        starts_at: (sub as any).starts_at,
        expires_at: (sub as any).expires_at,
        payment_ref: (sub as any).payment_ref ?? null,
        payer_name: p.full_name ?? null,
        payer_phone: p.phone ?? null,
        area: [p.mandal, p.district, p.state].filter(Boolean).join(", ") || null,
        district_admin_name: districtAdminName,
      },
    };
  });

// -------- Admin audit trail (who changed what, and when)
export const adminListAdminAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.isSuper && !scope.level) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("varadhi_admin_audit").select("*").order("created_at", { ascending: false });
    if (!scope.isSuper && scope.state) q = q.eq("state", scope.state);
    // Regional admins see only their own area's audit entries.
    if (!scope.isSuper && scope.district && scope.level !== "state_admin") q = q.eq("district", scope.district);
    if (!scope.isSuper && scope.level === "mandal_admin" && scope.mandal) q = q.eq("mandal", scope.mandal);
    const { data: rows, error } = await q.limit(Math.min(data.limit ?? 100, 300));
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as any[];
    const ids = Array.from(new Set(list.flatMap((r) => [r.actor_user_id, r.target_user_id]).filter(Boolean)));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: p } = await supabaseAdmin
        .from("varadhi_profiles").select("user_id, full_name").in("user_id", ids);
      for (const x of (p ?? []) as any[]) names.set(x.user_id, x.full_name);
    }
    return {
      entries: list.map((r) => ({
        ...r,
        actor_name: names.get(r.actor_user_id) ?? null,
        target_name: r.target_user_id ? names.get(r.target_user_id) ?? null : null,
      })),
    };
  });

// -------- User → Admin messages --------
export const sendVaradhiAdminMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string; phone?: string }) => d)
  .handler(async ({ data, context }) => {
    const message = (data.message ?? "").trim();
    if (!message) throw new Error("సందేశం రాయండి");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("varadhi_profiles")
      .select("state, district, mandal, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("varadhi_admin_messages").insert({
      user_id: context.userId,
      message,
      phone: (data.phone ?? "").trim() || (prof as any)?.phone || null,
      state: (prof as any)?.state ?? null,
      district: (prof as any)?.district ?? null,
      mandal: (prof as any)?.mandal ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyVaradhiAdminMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("varadhi_admin_messages")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { messages: (data ?? []) as any[] };
  });

export const adminListVaradhiMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.isSuper && !scope.level) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("varadhi_admin_messages").select("*").order("created_at", { ascending: false });
    if (!scope.isSuper && scope.state) q = q.eq("state", scope.state);
    if (!scope.isSuper && scope.district) q = q.eq("district", scope.district);
    if (!scope.isSuper && scope.level === "mandal_admin" && scope.mandal) q = q.eq("mandal", scope.mandal);
    const { data: rows, error } = await q.limit(Math.min(data.limit ?? 100, 300));
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: p } = await supabaseAdmin
        .from("varadhi_profiles").select("user_id, full_name").in("user_id", ids);
      for (const x of (p ?? []) as any[]) names.set(x.user_id, x.full_name);
    }
    return { messages: list.map((r) => ({ ...r, sender_name: names.get(r.user_id) ?? null })) };
  });

export const adminReplyVaradhiMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reply?: string; status?: string }) => d)
  .handler(async ({ data, context }) => {
    const scope = await loadAreaScope(context.userId, (context.claims as any)?.email);
    if (!scope.isSuper && !scope.level) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Area admins may only touch messages inside their own state/district.
    if (!scope.isSuper) {
      const { data: target } = await supabaseAdmin
        .from("varadhi_admin_messages").select("state, district, mandal").eq("id", data.id).maybeSingle();
      if (!target) throw new Error("Not found");
      const t = target as any;
      if (scope.state && t.state !== scope.state) throw new Error("మీ ప్రాంతం కాదు");
      if (scope.district && t.district !== scope.district) throw new Error("మీ జిల్లా కాదు");
      if (scope.level === "mandal_admin" && scope.mandal && t.mandal !== scope.mandal) {
        throw new Error("మీ మండలం కాదు");
      }
    }
    const patch: Record<string, unknown> = {};
    if (data.reply !== undefined) patch.admin_reply = data.reply.trim() || null;
    if (data.status) patch.status = data.status;
    const { error } = await supabaseAdmin
      .from("varadhi_admin_messages").update(patch as any).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -------- Home page ticker (live text) --------
export const getVaradhiTicker = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { VARADHI_DEFAULT_TICKER } = await import("@/lib/varadhi-ticker-defaults");
  const { data } = await supabaseAdmin
    .from("varadhi_site_settings")
    .select("ticker_te, ticker_en")
    .eq("id", 1)
    .maybeSingle();
  return {
    ticker_te: (data as any)?.ticker_te || VARADHI_DEFAULT_TICKER.te,
    ticker_en: (data as any)?.ticker_en || VARADHI_DEFAULT_TICKER.en,
  };
});

export const adminUpdateVaradhiTicker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticker_te: string; ticker_en: string }) => d)
  .handler(async ({ data, context }) => {
    await assertVaradhiAdmin(context.supabase, context.userId, (context.claims as any)?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { VARADHI_DEFAULT_TICKER } = await import("@/lib/varadhi-ticker-defaults");
    const { error } = await supabaseAdmin.from("varadhi_site_settings").upsert({
      id: 1,
      ticker_te: data.ticker_te.trim().slice(0, 500) || VARADHI_DEFAULT_TICKER.te,
      ticker_en: data.ticker_en.trim().slice(0, 500) || VARADHI_DEFAULT_TICKER.en,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
