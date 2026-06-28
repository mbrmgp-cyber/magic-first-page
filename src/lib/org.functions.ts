import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_APP_ORIGIN, memberRegistrationUrl } from "@/lib/public-url";
import QRCode from "qrcode";

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

async function sendMagicLoginLinkEmail(supabaseAdmin: any, email: string, redirectTo: string) {
  const [{ sendLovableEmail }, React, { render }, { MagicLinkEmail }] = await Promise.all([
    import("@lovable.dev/email-js"),
    import("react"),
    import("react-email"),
    import("@/lib/email-templates/magic-link"),
  ]);

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);

  const confirmationUrl = data?.properties?.action_link;
  if (!confirmationUrl) throw new Error("Could not generate login link");

  const siteName = "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ";
  const element = React.createElement(MagicLinkEmail, { siteName, confirmationUrl });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const messageId = crypto.randomUUID();
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Email service is not configured");

  try {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "magiclink",
      recipient_email: email,
      status: "pending",
    });

    await sendLovableEmail(
      {
        to: email,
        from: `${siteName} <noreply@notify.mbrplatform.com>`,
        sender_domain: "notify.mbrplatform.com",
        subject: "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ — Login link",
        html,
        text,
        purpose: "transactional",
        label: "magiclink",
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `auth-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId }
    );

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "magiclink",
      recipient_email: email,
      status: "sent",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "magiclink",
      recipient_email: email,
      status: "failed",
      error_message: message,
    });
    throw new Error(message);
  }
}

export const sendLoginLink = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) return { sent: false as const, reason: "missing_email" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);

    if (!userId) {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("id, email, user_id, preferred_lang")
        .ilike("email", email)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image file");
  const contentType = match[1];
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("Image must be under 3MB");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `public-requests/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("org-documents")
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = await supabaseAdmin.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
}

export const registerOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    email: string;
    phone?: string;
    slogan?: string;
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
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("admin_user_id", userId)
      .maybeSingle();
    if (!org) return { org: null, qrDataUrl: null };
    const qrDataUrl = await QRCode.toDataURL(memberRegistrationUrl(org.org_code), { width: 512, margin: 2 });
    return { org, qrDataUrl };
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
  .inputValidator((d: { theme_color?: string; theme_font?: string; theme_settings?: Record<string, any> }) => d)
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
    const { data: org, error } = await supabase
      .from("organizations")
      .update(patch as any)
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
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url")
      .eq("org_code", code)
      .maybeSingle();
    if (!org) return { valid: false as const };
    return { valid: true as const, org };
  });

export const submitMemberRequest = createServerFn({ method: "POST" })
  .inputValidator((d: {
    code: string; name: string; email: string;
    phone?: string; photo_url?: string; photo_data_url?: string;
    father_name?: string; address?: string;
    joined_date?: string;
    introducer_member_id?: string;
    committee_fee_paid?: number;
    first_name?: string;
    last_name?: string;
    village?: string;
    pin_code?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    preferred_lang?: string;
  }) => d)
  .handler(async ({ data }) => {
    const code = normalizeOrgCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("org_code", code)
      .maybeSingle();
    if (!org) throw new Error("Invalid QR / Code");

    let photo_url = data.photo_url ?? null;
    if (data.photo_data_url?.startsWith("data:image/")) {
      const match = data.photo_data_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid photo file");
      const contentType = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");
      const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const path = `public-requests/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("member-photos")
        .upload(path, bytes, { contentType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      photo_url = path;
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
        committee_fee_paid: data.committee_fee_paid ?? 0,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        village: data.village ?? null,
        pin_code: data.pin_code ?? null,
        bank_name: data.bank_name ?? null,
        bank_account_number: data.bank_account_number ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        preferred_lang: data.preferred_lang ?? "te",
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
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("members")
      .select("*, organizations(name, logo_url, slogan, letter_code, org_code, gov_reg_number, phone, email, president_name, president_signature_url, theme_color, theme_font, theme_settings, id_card_design)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { membership: data };
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
      .select("*")
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

export const getOrganizationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { org_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "mbr_admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", data.org_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!org) throw new Error("Organization not found");
    const { data: members } = await supabase
      .from("members")
      .select("id, name, member_code, status, email, phone, created_at")
      .eq("org_id", data.org_id)
      .order("created_at", { ascending: false });
    const list = (members ?? []) as any[];
    return {
      org,
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
    const q = (data.q || "").trim();
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
