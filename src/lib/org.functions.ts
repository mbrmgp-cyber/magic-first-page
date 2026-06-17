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
        founders: (data.founders ?? []).filter((f) => f.name?.trim()),
        org_code,
      })
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; name: string; email: string; phone?: string; photo_url?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const code = data.code.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("org_code", code)
      .maybeSingle();
    if (!org) throw new Error("సరైన QR / Code కాదు");
    const { data: member, error } = await supabase
      .from("members")
      .insert({
        org_id: org.id,
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        photo_url: data.photo_url ?? null,
        status: "pending",
      })
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
      .select("*, organizations(name, logo_url)")
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
