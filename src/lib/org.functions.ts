import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import QRCode from "qrcode";

function genOrgCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) s += chars[bytes[i] % chars.length];
  return s;
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
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const org_code = genOrgCode();
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        admin_user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        slogan: data.slogan ?? null,
        logo_url: data.logo_url ?? null,
        gov_reg_number: data.gov_reg_number ?? null,
        is_gov_registered: data.is_gov_registered ?? true,
        registration_certificate_url: data.registration_certificate_url ?? null,
        pan_card_url: data.pan_card_url ?? null,
        bank_account_number: data.bank_account_number ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        admin_name: data.admin_name ?? null,
        admin_designation: data.admin_designation ?? null,
        admin_aadhaar_url: data.admin_aadhaar_url ?? null,
        founders: (data.founders ?? []).filter((f) => f.name?.trim()),
        org_code,
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const qrDataUrl = await QRCode.toDataURL(org_code, { width: 512, margin: 2 });
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
    const qrDataUrl = await QRCode.toDataURL(org.org_code, { width: 512, margin: 2 });
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
    const qrDataUrl = await QRCode.toDataURL(newCode, { width: 512, margin: 2 });
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


export const validateOrgCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
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
  }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
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
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.byteLength > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");
      const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const path = `public-requests/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("member-photos")
        .upload(path, buffer, { contentType, upsert: false });
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
      .select("*, organizations(name, logo_url, slogan, letter_code, gov_reg_number, phone, email, president_name, president_signature_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { membership: data };
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
    const { error } = await supabase
      .from("members")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
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
      .select("id, name, email, phone, slogan, logo_url, gov_reg_number, founders, org_code, approval_status, approval_notes, approved_at, created_at")
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

