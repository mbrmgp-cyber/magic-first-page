import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_APP_ORIGIN, memberRegistrationUrl } from "@/lib/public-url";
import QRCode from "qrcode";
import { MEMBER_SAFE_COLUMNS, ORG_SAFE_COLUMNS } from "@/lib/db-columns";
import { findOrgByCode, parseSafeImageDataUrl } from "@/lib/org-code";
import type { Database } from "@/integrations/supabase/types";

type SafeOrgRow = Omit<
  Database["public"]["Tables"]["organizations"]["Row"],
  "registration_certificate_url" | "pan_card_url" | "admin_aadhaar_url"
>;

function normalizeOrgCode(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const value = parsed?.code || parsed?.org_code || parsed?.orgCode;
    if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
  } catch {}
  try {
    const url = new URL(raw);
    const value = url.searchParams.get("code") || url.searchParams.get("org_code") || url.searchParams.get("orgCode");
    if (value) return value.trim().toUpperCase();
  } catch {}
  const queryMatch = raw.match(/[?&](?:code|org_code|orgCode)=([^&#]+)/i);
  if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
  return raw.toUpperCase();
}

function genOrgCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) s += chars[bytes[i] % chars.length];
  return s;
}

async function findAuthUserIdByEmail(supabaseAdmin: any, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u: any) => u.email?.toLowerCase() === target);
    if (user) return user.id as string;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function sendMagicLoginLinkEmail(
  supabaseAdmin: any,
  email: string,
  redirectTo: string,
  opts?: { subject?: string; note?: string; label?: string }
) {
  const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
    import("@lovable.dev/email-js"),
    import("react"),
    import("react-email"),
    import("@/lib/email-templates/magic-link"),
  ]);

  // No magic links: the email only points to the normal login page.
  const confirmationUrl = redirectTo;


  const siteName = "MBR APP";
  const subject = opts?.subject || "MBR APP — Login link";
  const label = opts?.label || "magiclink";
  const element = React.createElement(MagicLinkEmail, { siteName, confirmationUrl, note: opts?.note });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const messageId = crypto.randomUUID();
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Email service is not configured");

  try {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "pending",
    });

    await sendLovableEmail(
      {
        to: email,
        from: `${siteName} <noreply@notify.mbrplatform.com>`,
        sender_domain: "notify.mbrplatform.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label,
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `auth-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId }
    );

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "sent",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "failed",
      error_message: message,
    });
    throw new Error(message);
  }
}

export const sendMemberProfileUpdatedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; name?: string | null }) => d)
  .handler(async ({ data }) => {
    const email = (data.email || "").trim().toLowerCase();
    if (!email) return { sent: false as const, reason: "missing_email" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure the auth user exists so the magic link works.
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);
    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "member" },
      });
      if (createError) throw new Error(createError.message);
      userId = created.user?.id ?? null;
    }
    const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=te`;
    const greetingName = data.name ? `${data.name}, ` : "";
    const note = `${greetingName}Your profile details have been updated by the Admin. Please login to review the changes. మీ ప్రొఫైల్ వివరాలను అడ్మిన్ అప్‌డేట్ చేశారు. మార్పులను చూడటానికి దయచేసి లాగిన్ అవ్వండి.`;
    await sendMagicLoginLinkEmail(supabaseAdmin, email, redirectTo, {
      subject: "MBR APP — Your profile was updated by Admin",
      note,
      label: "profile_updated",
    });
    return { sent: true as const };
  });

export const sendLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) return { sent: false as const, reason: "missing_email" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);

    if (!userId) {
      // Any member row saved by the admin (approved or still pending) may log in.
      const { data: rows } = await supabaseAdmin
        .from("members")
        .select("id, email, user_id, preferred_lang, status, created_at")
        .ilike("email", email)
        .order("created_at", { ascending: false });
      const rank = (s: string) => (s === "approved" ? 0 : s === "pending" ? 1 : 2);
      const member: any = (rows ?? []).slice().sort((a: any, b: any) => rank(a.status) - rank(b.status))[0];

      if (!member) return { sent: false as const, reason: "not_found" as const };

      userId = (member as any).user_id ?? await findAuthUserIdByEmail(supabaseAdmin, member.email);
      if (!userId) {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: member.email,
          password: `MBR-${crypto.randomUUID()}`,
          email_confirm: true,
          user_metadata: { role: "member" },
        });
        if (createError) throw new Error(createError.message);
        userId = created.user?.id;
      }

      if (userId && !(member as any).user_id) {
        const { error: claimError } = await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", member.id);
        if (claimError) throw new Error(claimError.message);
      }
    }

    const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=${encodeURIComponent(data.lang || "te")}`;
    await sendMagicLoginLinkEmail(supabaseAdmin, email, redirectTo);
    return { sent: true as const };
  });

export const sendMemberWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; name?: string; member_id?: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) return { sent: false as const, reason: "missing_email" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure auth user exists & is linked to the member row.
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);
    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "member" },
      });
      if (createError) throw new Error(createError.message);
      userId = created.user?.id ?? null;
    }
    if (userId && data.member_id) {
      await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", data.member_id);
    }
    const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=te`;
    await sendMagicLoginLinkEmail(supabaseAdmin, email, redirectTo);
    return { sent: true as const };
  });

async function uploadImageDataUrl(supabaseAdmin: any, dataUrl: string | undefined | null, folder: string) {
  if (!dataUrl?.startsWith("data:image/")) return dataUrl ?? null;
  const { contentType, bytes, ext } = parseSafeImageDataUrl(dataUrl);
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("Image must be under 3MB");
  const path = `public-requests/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("org-documents")
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  // Store only the object path. A short-lived signed URL is minted on demand
  // by getOrgDocumentSignedUrl for authorized viewers.
  return path;
}

/**
 * Mint a short-lived (10 min) signed URL for a private org document.
 * Only platform admins or people who can edit the owning organization may view.
 */
export const getOrgDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id?: string; path: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const path = (data.path || "").trim();
    if (!path) throw new Error("Missing document");
    if (/^https?:\/\//i.test(path)) return { url: path };
    if (path.includes("..")) throw new Error("Invalid document path");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) {
      if (!data.org_id) throw new Error("Forbidden");
      const { data: canEdit } = await supabase.rpc("can_edit_org", { _org_id: data.org_id });
      if (!canEdit) throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("org-documents")
      .createSignedUrl(path, 600);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });


export const registerOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    email: string;
    phone?: string;
    slogan?: string;
    address?: string;
    logo_url?: string;
    gov_reg_number?: string;
    is_gov_registered?: boolean;
    registration_certificate_url?: string;
    pan_card_url?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    admin_name?: string;
    admin_designation?: string;
    admin_aadhaar_url?: string;
    founders?: { name: string; address?: string; aadhaar_url?: string }[];
    client_uploads?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const org_code = genOrgCode();
    const supabaseAdmin = data.client_uploads ? (await import("@/integrations/supabase/client.server")).supabaseAdmin : null;
    const uploadFolder = userId ?? org_code;
    const logoUrl = supabaseAdmin ? await uploadImageDataUrl(supabaseAdmin, data.logo_url, `${uploadFolder}/logo`) : data.logo_url;
    const certificateUrl = supabaseAdmin ? await uploadImageDataUrl(supabaseAdmin, data.registration_certificate_url, `${uploadFolder}/certificate`) : data.registration_certificate_url;
    const panUrl = supabaseAdmin ? await uploadImageDataUrl(supabaseAdmin, data.pan_card_url, `${uploadFolder}/pan`) : data.pan_card_url;
    const adminAadhaarUrl = supabaseAdmin ? await uploadImageDataUrl(supabaseAdmin, data.admin_aadhaar_url, `${uploadFolder}/admin-aadhaar`) : data.admin_aadhaar_url;
    const founders = await Promise.all((data.founders ?? []).filter((f) => f.name?.trim()).map(async (f, i) => ({
      name: f.name.trim(),
      address: f.address?.trim() || undefined,
      aadhaar_url: supabaseAdmin ? await uploadImageDataUrl(supabaseAdmin, f.aadhaar_url, `${uploadFolder}/founder-${i + 1}`) : f.aadhaar_url,
    })));
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        admin_user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        slogan: data.slogan ?? null,
        address: (data.address ?? null) as any,
        logo_url: logoUrl ?? null,
        gov_reg_number: data.gov_reg_number ?? null,
        is_gov_registered: data.is_gov_registered ?? true,
        registration_certificate_url: certificateUrl ?? null,
        pan_card_url: panUrl ?? null,
        bank_account_number: data.bank_account_number ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        admin_name: data.admin_name ?? null,
        admin_designation: data.admin_designation ?? null,
        admin_aadhaar_url: adminAadhaarUrl ?? null,
        founders,
        org_code,
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const qrDataUrl = await QRCode.toDataURL(memberRegistrationUrl(org_code), { width: 512, margin: 2 });
    return { org, qrDataUrl };
  });


export const getMyOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ownedOrgResult = await supabase
      .from("organizations")
      .select(ORG_SAFE_COLUMNS)
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (ownedOrgResult.error) throw new Error(ownedOrgResult.error.message);
    let org = ownedOrgResult.data as unknown as SafeOrgRow | null;
    // Committee members (e.g. treasurer) can also open the org admin dashboard
    // via their own account; resolve the org through their active membership.
    if (!org) {
      const memberResult = await supabase
        .from("members")
        .select("id, org_id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (memberResult.error) throw new Error(memberResult.error.message);
      const me = memberResult.data;
      if (me?.id && me?.org_id) {
        const committeeResult = await supabase
          .from("committee_members")
          .select("id")
          .eq("member_id", me.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (committeeResult.error) throw new Error(committeeResult.error.message);
        const cm = committeeResult.data;
        if (cm?.id) {
          const committeeOrgResult = await supabase
            .from("organizations")
            .select(ORG_SAFE_COLUMNS)
            .eq("id", me.org_id)
            .maybeSingle();
          if (committeeOrgResult.error) throw new Error(committeeOrgResult.error.message);
          const orgViaCommittee = committeeOrgResult.data as unknown as SafeOrgRow | null;
          if (orgViaCommittee) org = orgViaCommittee;
        }
      }
    }
    if (!org) return { org: null, qrDataUrl: null };
    const qrDataUrl = await QRCode.toDataURL(memberRegistrationUrl(org.org_code), { width: 512, margin: 2 });
    return { org, qrDataUrl };
  });

// Returns whether the current user has an active committee seat, and in
// which organization / role. Used to expose an "Open Admin Panel" toggle
// on the member dashboard for treasurers, presidents, etc.
export const getMyCommitteeAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("members")
      .select("id, org_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!me?.id) return { isCommittee: false as const, role: null, orgId: null, isPrimaryAdmin: false };
    const [{ data: cm }, { data: orgRow }] = await Promise.all([
      supabase
        .from("committee_members")
        .select("role")
        .eq("member_id", me.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      me.org_id
        ? supabase.from("organizations").select("admin_user_id").eq("id", me.org_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      isCommittee: !!cm,
      role: (cm?.role as string | null) ?? null,
      orgId: me.org_id ?? null,
      isPrimaryAdmin: !!orgRow && (orgRow as any).admin_user_id === userId,
    };
  });

export const regenerateOrgQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (!org) throw new Error("Organization not found");
    const newCode = genOrgCode();
    const { data: updated, error } = await supabase
      .from("organizations")
      .update({ org_code: newCode })
      .eq("id", org.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const qrDataUrl = await QRCode.toDataURL(memberRegistrationUrl(newCode), { width: 512, margin: 2 });
    return { org: updated, qrDataUrl };
  });

export const updateOrgLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { logo_url: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org, error } = await supabase
      .from("organizations")
      .update({ logo_url: data.logo_url })
      .eq("admin_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { org };
});

export const updateOrgPresident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { president_name?: string | null; president_signature_url?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, any> = {};
    if (data.president_name !== undefined) patch.president_name = data.president_name;
    if (data.president_signature_url !== undefined) patch.president_signature_url = data.president_signature_url;
    const { data: org, error } = await supabase
      .from("organizations")
      .update(patch as any)
      .eq("admin_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { org };
  });

export const updateOrgTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { theme_color?: string; theme_font?: string; theme_settings?: Record<string, any>; name_en?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, any> = {};
    const isHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
    if (data.theme_color !== undefined) {
      if (!isHex(data.theme_color)) throw new Error("Invalid color");
      patch.theme_color = data.theme_color;
    }
    if (data.theme_font !== undefined) {
      const allowed = ["Inter", "Poppins", "Playfair Display", "Merriweather", "Roboto Slab", "Noto Sans"];
      if (!allowed.includes(data.theme_font)) throw new Error("Invalid font");
      patch.theme_font = data.theme_font;
    }
    if (data.theme_settings !== undefined) {
      const s = data.theme_settings || {};
      const colorKeys = ["bg", "box", "bigBox", "miniBox", "border", "icon", "buttonBg", "buttonText", "inputBg", "inputText", "headColor", "subColor", "smallColor"];
      for (const k of colorKeys) {
        if (s[k] !== undefined && s[k] !== null && s[k] !== "" && !isHex(String(s[k]))) {
          throw new Error(`Invalid ${k}`);
        }
      }
      const allowedFonts = ["Inter", "Poppins", "Playfair Display", "Merriweather", "Roboto Slab", "Noto Sans"];
      for (const k of ["headFont", "subFont"]) {
        if (s[k] !== undefined && s[k] !== null && s[k] !== "" && !allowedFonts.includes(String(s[k]))) {
          throw new Error(`Invalid ${k}`);
        }
      }
      if (s.headAlign !== undefined && !["left", "center", "right"].includes(String(s.headAlign))) {
        throw new Error("Invalid headAlign");
      }
      patch.theme_settings = s;
    }
    if (data.name_en !== undefined) {
      const v = typeof data.name_en === "string" ? data.name_en.trim().slice(0, 200) : "";
      patch.name_en = v ? v : null;
    }
    const { data: org, error } = await supabase
      .from("organizations")
      .update(patch as any)
      .eq("admin_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { org };
  });

export const updateOrgAdBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ad_banners: Array<{ url: string; active?: boolean; label?: string | null }> }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cleaned = (data.ad_banners || [])
      .filter((b) => b && typeof b.url === "string" && b.url.length > 0)
      .slice(0, 20)
      .map((b) => ({
        url: String(b.url),
        active: b.active !== false,
        label: b.label ? String(b.label).slice(0, 120) : null,
      }));
    const { data: org, error } = await supabase
      .from("organizations")
      .update({ ad_banners: cleaned } as any)
      .eq("admin_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { org };
  });

export const updateOrgIdDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id_card_design: Record<string, any> }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org, error } = await supabase
      .from("organizations")
      .update({ id_card_design: data.id_card_design } as any)
      .eq("admin_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { org };
  });







export const validateOrgCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = normalizeOrgCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Match either full org_code (legacy long hash) or the short letter_code (A, B, C...)
    const org = await findOrgByCode(supabaseAdmin, code, "id, name, logo_url, org_code, letter_code");
    if (!org) return { valid: false as const };
    // Return the canonical org_code so downstream registration flow keeps working
    return { valid: true as const, org: { id: org.id, name: org.name, logo_url: org.logo_url, org_code: org.org_code, letter_code: org.letter_code } };
  });

export const sendMemberIdLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { org_code: string; member_seq: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const code = normalizeOrgCode(data.org_code);
    const seq = (data.member_seq || "").trim().replace(/^0+(?=\d)/, "");
    if (!code || !seq) return { sent: false as const, reason: "missing" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const org = await findOrgByCode(supabaseAdmin, code, "id, letter_code, org_code");
    if (!org) return { sent: false as const, reason: "org_not_found" as const };
    const padded = seq.padStart(4, "0");
    const memberCode = `${org.letter_code}/${padded}`;
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, email, name")
      .eq("org_id", org.id)
      .eq("member_code", memberCode)
      .eq("status", "approved")
      .maybeSingle();
    if (!member || !member.email) return { sent: false as const, reason: "member_not_found" as const };
    const email = member.email.trim().toLowerCase();
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);
    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "member" },
      });
      if (createError) throw new Error(createError.message);
      userId = created.user?.id ?? null;
      if (userId) await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", member.id);
    }
    const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=${encodeURIComponent(data.lang || "te")}`;
    await sendMagicLoginLinkEmail(supabaseAdmin, email, redirectTo);
    return { sent: true as const, email_hint: email.replace(/^(.).+(@.+)$/, "$1***$2") };
  });

export const submitMemberRequest = createServerFn({ method: "POST" })
  .inputValidator((d: {
    code: string; name: string; email: string;
    phone?: string; photo_url?: string; photo_data_url?: string;
    father_name?: string; address?: string;
    joined_date?: string;
    introducer_member_id?: string;
    introduced_by_name?: string;
    introducer_id?: string;
    committee_fee_paid?: number;
    first_name?: string;
    last_name?: string;
    village?: string;
    pin_code?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    blood_group?: string;
    preferred_lang?: string;
    receipt_data_url?: string;
  }) => d)
  .handler(async ({ data }) => {
    const code = normalizeOrgCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const org = await findOrgByCode(supabaseAdmin, code, "id");
    if (!org) throw new Error("Invalid QR / Code");

    let photo_url = data.photo_url ?? null;
    if (data.photo_data_url?.startsWith("data:image/")) {
      const { contentType, bytes, ext } = parseSafeImageDataUrl(data.photo_data_url);
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");
      const path = `public-requests/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("member-photos")
        .upload(path, bytes, { contentType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      photo_url = path;
    }

    let membership_receipt_url: string | null = null;
    if (data.receipt_data_url?.startsWith("data:")) {
      const match = data.receipt_data_url.match(/^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid receipt file");
      const contentType = match[1].toLowerCase();
      const allowedReceiptTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
      if (!allowedReceiptTypes.includes(contentType)) throw new Error("Only JPG, PNG, WEBP or PDF receipts are allowed");
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Receipt must be under 5MB");
      const ext = contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      const path = `public-requests/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error: rErr } = await supabaseAdmin.storage
        .from("member-receipts")
        .upload(path, bytes, { contentType, upsert: false });
      if (rErr) throw new Error(rErr.message);
      membership_receipt_url = path;
    }

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .insert({
        org_id: org.id,
        user_id: null,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        photo_url,
        father_name: data.father_name ?? null,
        address: data.address ?? null,
        joined_date: data.joined_date ?? null,
        introducer_member_id: data.introducer_member_id ?? null,
        introduced_by_name: data.introduced_by_name ?? null,
        introducer_id: data.introducer_id ?? null,
        committee_fee_paid: data.committee_fee_paid ?? 0,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        village: data.village ?? null,
        pin_code: data.pin_code ?? null,
        bank_name: data.bank_name ?? null,
        bank_account_number: data.bank_account_number ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        blood_group: data.blood_group ?? null,
        preferred_lang: data.preferred_lang ?? "te",
        membership_receipt_url,
        status: "pending",
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { member };
  });

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    // Auto-claim: if a member row exists with matching email but no user_id, link it now.
    const email = ((claims as any)?.email || "").trim().toLowerCase();
    if (email) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("members")
          .update({ user_id: userId })
          .is("user_id", null)
          .ilike("email", email);
      } catch {}
    }
    const { data: rows } = await supabase
      .from("members")
      .select(`${MEMBER_SAFE_COLUMNS}, organizations(id, name, admin_user_id, logo_url, slogan, letter_code, org_code, gov_reg_number, phone, email, president_name, president_signature_url, theme_color, theme_font, theme_settings, id_card_design, ad_banners, bank_name, bank_branch, bank_account_number, bank_ifsc, bank_account_holder)` as "*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    // A member may have more than one row (duplicate/old registration).
    // Always prefer the approved one so an old rejected duplicate never
    // blocks a genuinely approved member.
    const rank = (s: string) => (s === "approved" ? 0 : s === "pending" ? 1 : 2);
    const list = (rows ?? []).slice().sort((a: any, b: any) => rank(a.status) - rank(b.status));
    return { membership: list[0] ?? null };
  });


export const sendApprovedMemberLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim();
    if (!email) return { sent: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, email, user_id, preferred_lang")
      .ilike("email", email)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!member) return { sent: false as const };
    let memberUserId = (member as any).user_id ?? await findAuthUserIdByEmail(supabaseAdmin, member.email);
    if (!memberUserId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "member" },
      });
      if (createError) throw new Error(createError.message);
      memberUserId = created.user?.id;
    }
    if (memberUserId && !(member as any).user_id) {
      const { error: claimError } = await supabaseAdmin.from("members").update({ user_id: memberUserId }).eq("id", member.id);
      if (claimError) throw new Error(claimError.message);
    }
    const lang = data.lang || (member as any).preferred_lang || "te";
    const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=${encodeURIComponent(lang)}`;
    await sendMagicLoginLinkEmail(supabaseAdmin, member.email, redirectTo);
    return { sent: true as const };
  });

export const listOrgMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (!org) return { members: [] };
    const { data: members } = await supabase
      .from("members")
      .select(MEMBER_SAFE_COLUMNS as "*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    return { members: members ?? [] };
  });

export const reviewMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; action: "approve" | "reject" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const status = data.action === "approve" ? "approved" : "rejected";
    const { data: memberRow, error } = await supabase
      .from("members")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", data.member_id)
      .select("id, email, preferred_lang")
      .single();
    if (error) throw new Error(error.message);
    if (data.action === "approve" && memberRow?.email) {
      const lang = (memberRow as any).preferred_lang || "te";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let memberUserId = await findAuthUserIdByEmail(supabaseAdmin, memberRow.email);
      if (!memberUserId) {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: memberRow.email,
          password: `MBR-${crypto.randomUUID()}`,
          email_confirm: true,
          user_metadata: { role: "member" },
        });
        if (createError) throw new Error(createError.message);
        memberUserId = created.user?.id;
      }
      if (memberUserId) {
        const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=${encodeURIComponent(lang)}`;
        await sendMagicLoginLinkEmail(supabaseAdmin, memberRow.email, redirectTo);
        const { error: claimError } = await supabaseAdmin
          .from("members")
          .update({ user_id: memberUserId })
          .eq("id", memberRow.id)
          .is("user_id", null);
        if (claimError) throw new Error(claimError.message);
      }
    }
    return { ok: true };
  });

// ===== MBR Admin: approval workflow =====

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return { roles: (data ?? []).map((r) => r.role), userId };
  });

// First-claim bootstrap: if no MBR admin exists yet, the caller becomes admin.
export const claimMbrAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "mbr_admin");
    if ((count ?? 0) > 0) {
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "mbr_admin")
        .maybeSingle();
      if (!mine) throw new Error("MBR admin ఇప్పటికే assign అయ్యారు");
      return { ok: true, alreadyMine: true };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "mbr_admin" });
    if (error) throw new Error(error.message);
    return { ok: true, claimed: true };
  });

export const listAllOrgsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("id, name, email, phone, slogan, logo_url, gov_reg_number, founders, org_code, approval_status, approval_notes, approved_at, created_at, subscription_expires_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orgs: orgs ?? [] };
  });

export const reviewOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id: string; action: "approve" | "reject"; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const status = data.action === "approve" ? "approved" : "rejected";
    const { error } = await supabase
      .from("organizations")
      .update({
        approval_status: status,
        approval_notes: data.notes ?? null,
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq("id", data.org_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrganizationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id: string; status: "pending" | "approved" | "rejected" | "suspended"; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("organizations")
      .update({
        approval_status: data.status,
        approval_notes: data.notes ?? null,
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq("id", data.org_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    org_id: string;
    name?: string;
    email?: string;
    phone?: string | null;
    slogan?: string | null;
    address?: string | null;
    gov_reg_number?: string | null;
    logo_url?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.slogan !== undefined) patch.slogan = data.slogan;
    if (data.address !== undefined) patch.address = data.address;
    if (data.gov_reg_number !== undefined) patch.gov_reg_number = data.gov_reg_number;
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("organizations")
      .update(patch as any)
      .eq("id", data.org_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id: string; confirm_code: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error: fetchErr } = await supabaseAdmin
      .from("organizations")
      .select("id, org_code")
      .eq("id", data.org_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!org) throw new Error("Organization not found");
    if ((data.confirm_code || "").trim().toUpperCase() !== String(org.org_code).toUpperCase()) {
      throw new Error("Confirmation code doesn't match the organization code");
    }
    // Best-effort cleanup of dependent rows so delete doesn't fail on FKs.
    const orgId = data.org_id;
    const tables = [
      "bids", "auction_payments", "auction_month_archives", "auction_sessions", "chit_auctions",
      "member_loan_payments", "member_loan_requests", "member_loans",
      "member_leave_requests",
      "disciplinary_suspensions", "disciplinary_president_nominations", "disciplinary_committee_members",
      "committee_members",
      "org_election_votes", "org_election_nominations", "org_elections",
      "org_resolutions", "org_meetings", "org_milestones", "org_activities", "org_rules",
      "org_income", "org_expenses", "wallet_accounts",
      "donations", "donors",
      "chat_interactions", "chat_announcements",
      "admin_module_access",
      "members",
    ];
    for (const t of tables) {
      await supabaseAdmin.from(t as any).delete().eq("org_id", orgId);
    }
    const { error } = await supabaseAdmin.from("organizations").delete().eq("id", orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getOrganizationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: org, error } = await supabase
      .from("organizations")
      .select(ORG_SAFE_COLUMNS)
      .eq("id", data.org_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const safeOrg = org as unknown as SafeOrgRow | null;
    if (!safeOrg) throw new Error("Organization not found");
    const { data: members } = await supabase
      .from("members")
      .select("id, name, member_code, status, email, phone, created_at")
      .eq("org_id", data.org_id)
      .order("created_at", { ascending: false });
    const list = (members ?? []) as any[];
    return {
      org: safeOrg,
      members: list,
      counts: {
        total: list.length,
        approved: list.filter((m) => m.status === "approved").length,
        pending: list.filter((m) => m.status === "pending").length,
        rejected: list.filter((m) => m.status === "rejected").length,
      },
    };
  });

export const sendMeetingInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    org_id: string;
    scope: "committee" | "all";
    title: string;
    scheduled_at: string;
    meeting_type: string;
    location?: string | null;
    meeting_link?: string | null;
    agenda?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, admin_user_id")
      .eq("id", data.org_id)
      .maybeSingle();
    if (!org || org.admin_user_id !== userId) throw new Error("Forbidden");

    let query = supabase
      .from("members")
      .select("email, is_committee")
      .eq("org_id", data.org_id)
      .eq("status", "approved")
      .not("email", "is", null);
    if (data.scope === "committee") query = query.eq("is_committee", true);
    const { data: rows, error: memErr } = await query;
    if (memErr) throw new Error(memErr.message);
    const recipients: string[] = Array.from(new Set((rows ?? [])
      .map((r: any) => String(r.email || "").trim().toLowerCase())
      .filter((e: string) => e.length > 0)));
    if (recipients.length === 0) return { sent: 0, total: 0, scope: data.scope };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Email service is not configured");

    const [{ sendLovableEmail }, React, { render }, { MeetingInviteEmail }, { supabaseAdmin }] = await Promise.all([
      import("@lovable.dev/email-js"),
      import("react"),
      import("react-email"),
      import("@/lib/email-templates/meeting-invite"),
      import("@/integrations/supabase/client.server"),
    ]);

    const siteName = org.name || "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ";
    const whenDate = new Date(data.scheduled_at);
    const whenText = whenDate.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
    const meetingTypeLabel = data.meeting_type === "online" ? "ఆన్‌లైన్ / Online" : "ఆఫ్‌లైన్ / Offline";

    const element = React.createElement(MeetingInviteEmail, {
      siteName,
      title: data.title,
      whenText,
      meetingType: meetingTypeLabel,
      location: data.location,
      meetingLink: data.meeting_link,
      agenda: data.agenda,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject = `${siteName} — సమావేశ ఆహ్వానం: ${data.title}`;

    let sent = 0;
    for (const to of recipients) {
      const messageId = crypto.randomUUID();
      try {
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "meeting_invite",
          recipient_email: to,
          status: "pending",
        });
        await sendLovableEmail(
          {
            to,
            from: `${siteName} <noreply@notify.mbrplatform.com>`,
            sender_domain: "notify.mbrplatform.com",
            subject,
            html,
            text,
            purpose: "transactional",
            label: "meeting_invite",
            message_id: messageId,
            idempotency_key: messageId,
            unsubscribe_token: `meeting-${messageId}`,
          },
          { apiKey, idempotencyKey: messageId }
        );
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "meeting_invite",
          recipient_email: to,
          status: "sent",
        });
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "meeting_invite",
          recipient_email: to,
          status: "failed",
          error_message: msg,
        });
      }
    }

    return { sent, total: recipients.length, scope: data.scope };
  });

// ===== MBR Admin: search members & update member_code globally =====

export const adminSearchMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Strip PostgREST filter metacharacters so input can never alter the .or() structure.
    const q = (data.q || "").trim().replace(/[(),."\\%]/g, "").slice(0, 80);
    if (!q) return { members: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("members")
      .select("id, name, member_code, email, phone, org_id, organizations:org_id(name)")
      .or(`member_code.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(25);
    if (error) throw new Error(error.message);
    return { members: rows ?? [] };
  });

export const adminUpdateMemberCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; new_code: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await supabase.rpc("admin_update_member_code", {
      _member_id: data.member_id,
      _new_code: data.new_code,
    });
    if (error) throw new Error(error.message);
    return { ok: true, member: row };
  });

export const setOrgSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    org_id: string;
    expires_at?: string | null;
    extend_days?: number;
    amount?: number;
    currency?: string;
    payment_method?: string;
    notes?: string;
    create_receipt?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row } = await supabase
      .from("organizations")
      .select("subscription_expires_at")
      .eq("id", data.org_id)
      .maybeSingle();
    const prevExpiry = row?.subscription_expires_at ? new Date(row.subscription_expires_at as string) : null;
    const nowInFuture = prevExpiry && prevExpiry.getTime() > Date.now() ? prevExpiry : new Date();
    let nextExpiry: string;
    let periodStart: string = nowInFuture.toISOString();
    if (typeof data.extend_days === "number" && data.extend_days !== 0) {
      const start = new Date(nowInFuture);
      start.setDate(start.getDate() + data.extend_days);
      nextExpiry = start.toISOString();
    } else if (data.expires_at) {
      const d = new Date(data.expires_at);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      nextExpiry = d.toISOString();
    } else {
      throw new Error("Provide expires_at or extend_days");
    }
    const { error } = await supabase
      .from("organizations")
      .update({ subscription_expires_at: nextExpiry })
      .eq("id", data.org_id);
    if (error) throw new Error(error.message);

    let receipt: any = null;
    if (data.create_receipt !== false) {
      const { data: rcpt, error: rErr } = await supabase
        .from("subscription_payments")
        .insert({
          org_id: data.org_id,
          amount: Number(data.amount ?? 0),
          currency: (data.currency || "INR").toUpperCase(),
          period_start: periodStart,
          period_end: nextExpiry,
          payment_method: data.payment_method || "other",
          notes: data.notes || null,
          recorded_by: userId,
          status: "paid",
        } as any)
        .select("*")
        .single();
      if (rErr) throw new Error(rErr.message);
      receipt = rcpt;
    }
    return { ok: true, subscription_expires_at: nextExpiry, receipt };
  });

export const listOrgReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let orgId = data.org_id ?? null;
    if (!orgId) {
      const { data: adminOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", userId)
        .maybeSingle();
      if (adminOrg?.id) orgId = adminOrg.id as string;
      else {
        const { data: mem } = await supabase
          .from("members")
          .select("org_id")
          .eq("user_id", userId)
          .eq("status", "approved")
          .maybeSingle();
        if (mem?.org_id) orgId = mem.org_id as string;
      }
    }
    if (!orgId) return { receipts: [], org: null };

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, org_code, email, phone, gov_reg_number, logo_url, subscription_expires_at, theme_color")
      .eq("id", orgId)
      .maybeSingle();

    const { data: receipts, error } = await supabase
      .from("subscription_payments")
      .select("*")
      .eq("org_id", orgId)
      .order("paid_on", { ascending: false });
    if (error) throw new Error(error.message);
    return { receipts: receipts ?? [], org };
  });

export const getMySubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // try admin first
    let { data: org } = await supabase
      .from("organizations")
      .select("id, name, subscription_expires_at, admin_user_id")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (!org) {
      const { data: mem } = await supabase
        .from("members")
        .select("org_id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .maybeSingle();
      if (mem?.org_id) {
        const { data: o2 } = await supabase
          .from("organizations")
          .select("id, name, subscription_expires_at, admin_user_id")
          .eq("id", mem.org_id)
          .maybeSingle();
        org = o2 ?? null;
      }
    }
    if (!org) return { has_org: false, expired: false, expires_at: null, org_name: null };
    const exp = org.subscription_expires_at ? new Date(org.subscription_expires_at as string) : null;
    const expired = !!exp && exp.getTime() < Date.now();
    return {
      has_org: true,
      expired,
      expires_at: org.subscription_expires_at,
      org_name: org.name,
    };
  });


export const getOrgBankDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: adminOrg } = await supabase
      .from("organizations")
      .select("id, name, bank_name, bank_branch, bank_account_number, bank_ifsc, bank_account_holder")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (adminOrg) return { org: adminOrg, is_admin: true };
    const { data: member } = await supabase
      .from("members")
      .select("organizations(id, name, bank_name, bank_branch, bank_account_number, bank_ifsc, bank_account_holder)")
      .eq("user_id", userId)
      .maybeSingle();
    return { org: (member as any)?.organizations ?? null, is_admin: false };
  });

export const updateOrgBankDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    bank_name?: string;
    bank_branch?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_account_holder?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org, error } = await supabase
      .from("organizations")
      .update({
        bank_name: data.bank_name ?? null,
        bank_branch: data.bank_branch ?? null,
        bank_account_number: data.bank_account_number ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        bank_account_holder: data.bank_account_holder ?? null,
      } as any)
      .eq("admin_user_id", userId)
      .select("id, bank_name, bank_branch, bank_account_number, bank_ifsc, bank_account_holder")
      .single();
    if (error) throw new Error(error.message);
    return { org };
  });

// -------- MBR OTP + password auth (no magic links) --------

async function resolveMbrLoginEmailFor(supabaseAdmin: any, identifier: string) {
  const raw = (identifier || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return raw.toLowerCase();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const last10 = digits.slice(-10);
  const { data: rows } = await supabaseAdmin
    .from("members")
    .select("email, phone, created_at")
    .ilike("phone", `%${last10}%`)
    .order("created_at", { ascending: false });
  const hit = (rows ?? []).find((r: any) => r?.email && String(r.phone || "").replace(/\D/g, "").endsWith(last10));
  return hit?.email ? String(hit.email).toLowerCase() : null;
}

async function sendMbrOtpEmail(supabaseAdmin: any, email: string) {
  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${PUBLIC_APP_ORIGIN}/auth` },
  });
  if (error) throw new Error(error.message);
  const otp = (link?.properties as any)?.email_otp as string | undefined;
  const confirmationUrl = `${PUBLIC_APP_ORIGIN}/auth`;
  if (!otp) throw new Error("Could not generate OTP");

  const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
    import("@lovable.dev/email-js"),
    import("react"),
    import("react-email"),
    import("@/lib/email-templates/magic-link"),
  ]);
  const siteName = "MBR APP";
  const note = `Your ${otp.length}-digit one-time code / OTP: ${otp}\nమీ ${otp.length} అంకెల OTP కోడ్: ${otp}`;
  const element = React.createElement(MagicLinkEmail, { siteName, confirmationUrl: confirmationUrl ?? "", note });
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
      subject: `MBR APP — Login code ${otp}`,
      html,
      text,
      purpose: "transactional",
      label: "mbr_otp",
      message_id: messageId,
      idempotency_key: messageId,
      unsubscribe_token: `mbr-otp-${messageId}`,
    },
    { apiKey, idempotencyKey: messageId }
  );
  return otp.length;
}

/** Mask an email so it can be shown as a hint without leaking the address. */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [dom, ...tld] = domain.split(".");
  const mask = (s: string) => (s.length <= 1 ? "*" : `${s[0]}***`);
  return `${mask(local)}@${mask(dom)}.${tld.join(".") || "com"}`;
}

/**
 * Password login by email OR phone. The linked email is resolved server-side
 * and never returned to the client; only the resulting session is sent back.
 */
export const mbrPasswordLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = await resolveMbrLoginEmailFor(supabaseAdmin, data.identifier);
    if (!email) return { ok: false as const, reason: "not_found" as const };
    const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !authData.session) return { ok: false as const, reason: "invalid_credentials" as const };
    return {
      ok: true as const,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    };
  });

/**
 * Verifies an OTP against the account behind an email/phone identifier.
 * The email is resolved server-side and never exposed to the client.
 */
export const verifyMbrOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; token: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = await resolveMbrLoginEmailFor(supabaseAdmin, data.identifier);
    if (!email) return { ok: false as const, reason: "not_found" as const };
    const { data: authData, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: (data.token || "").trim(),
      type: "email",
    });
    if (error || !authData.session) return { ok: false as const, reason: "invalid_code" as const };
    return {
      ok: true as const,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    };
  });

/** Sends a numeric OTP for MBR registration / password reset. */
export const sendMbrOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = await resolveMbrLoginEmailFor(supabaseAdmin, data.identifier);
    if (!email) return { sent: false as const, reason: "not_found" as const };

    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);
    if (!userId) {
      const { data: rows } = await supabaseAdmin
        .from("members")
        .select("id, email, user_id, status, created_at")
        .ilike("email", email)
        .order("created_at", { ascending: false });
      const member: any = (rows ?? [])[0];
      if (!member) return { sent: false as const, reason: "not_found" as const };
      userId = member.user_id ?? null;
      if (!userId) {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: `MBR-${crypto.randomUUID()}`,
          email_confirm: true,
          user_metadata: { role: "member" },
        });
        if (createError) throw new Error(createError.message);
        userId = created.user?.id ?? null;
      }
      if (userId && !member.user_id) {
        await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", member.id);
      }
    }

    const otpLength = await sendMbrOtpEmail(supabaseAdmin, email);
    return { sent: true as const, emailHint: maskEmail(email), otpLength };
  });

// ===== MBR Super Admin: approve / reject a member of ANY organization =====
export const adminReviewMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; action: "approve" | "reject" | "pending" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const status =
      data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "pending";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("members")
      .update({ status } as any)
      .eq("id", data.member_id)
      .select("id, name, email, status")
      .maybeSingle();
    if (error) throw new Error(error.message);

    let emailSent = false;
    if (status === "approved" && (row as any)?.email) {
      try {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: data.member_id,
          subject: "MBR APP — Your membership is approved",
          label: "member_approved",
          note: `${(row as any)?.name ?? "సభ్యుడు"}, మీ సభ్యత్వం ఆమోదించబడింది. ఈ లింక్ ఓపెన్ చేస్తే మీ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.`,
        });
        emailSent = sent.sent;
      } catch { /* best effort */ }
    }
    return { ok: true, status, emailSent };
  });
