import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOrgForUser(supabase: any, userId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("id, donor_recognition_threshold")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (org) return { orgId: org.id as string, threshold: Number(org.donor_recognition_threshold ?? 5000) };
  const { data: m } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (!m?.org_id) return { orgId: null as any, threshold: 5000 };
  const { data: o2 } = await supabase
    .from("organizations")
    .select("donor_recognition_threshold")
    .eq("id", m.org_id)
    .maybeSingle();
  return { orgId: m.org_id as string, threshold: Number(o2?.donor_recognition_threshold ?? 5000) };
}

export const listDonors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { orgId, threshold } = await getOrgForUser(supabase, userId);
    if (!orgId) return { donors: [], orgId: null, threshold };
    const { data, error } = await supabase
      .from("donors")
      .select("*, linked_member:linked_member_id(id,name,member_code)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { donors: data ?? [], orgId, threshold };
  });

export const listDonorDonations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { donor_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("donations")
      .select("*")
      .eq("donor_id", data.donor_id)
      .order("donation_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { donations: rows ?? [] };
  });

export const adminAddDonor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    first_name: string;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    photo_url?: string | null;
    linked_member_id?: string | null;
    notes?: string | null;
    status?: "pending" | "approved" | "inactive";
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { orgId } = await getOrgForUser(supabase, userId);
    if (!orgId) throw new Error("Organization కనపడలేదు");
    const { data: row, error } = await supabase.from("donors").insert({
      org_id: orgId,
      first_name: data.first_name,
      last_name: data.last_name ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      photo_url: data.photo_url ?? null,
      linked_member_id: data.linked_member_id ?? null,
      notes: data.notes ?? null,
      status: data.status ?? "approved",
    }).select().single();
    if (error) throw new Error(error.message);
    return { id: row.id, orgId };
  });

export const updateDonor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    donor_id: string;
    first_name?: string;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    photo_url?: string | null;
    linked_member_id?: string | null;
    notes?: string | null;
    status?: "pending" | "approved" | "inactive";
    momento_issued?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = {};
    for (const k of ["first_name","last_name","phone","email","photo_url","linked_member_id","notes","status"] as const) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    if (data.momento_issued !== undefined) {
      patch.momento_issued = data.momento_issued;
      patch.momento_issued_at = data.momento_issued ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from("donors").update(patch).eq("id", data.donor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDonor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { donor_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("donors").delete().eq("id", data.donor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewDonor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { donor_id: string; action: "approve" | "reject" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.action === "reject") {
      const { error } = await supabase.from("donors").delete().eq("id", data.donor_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("donors").update({ status: "approved" }).eq("id", data.donor_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const addDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    donor_id: string;
    amount: number;
    donation_date?: string | null;
    mode?: "cash" | "upi" | "bank" | "cheque" | "other";
    receipt_no?: string | null;
    proof_url?: string | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { orgId } = await getOrgForUser(supabase, userId);
    if (!orgId) throw new Error("Organization కనపడలేదు");
    if (!(data.amount > 0)) throw new Error("Amount తప్పు");
    const { data: row, error } = await supabase.from("donations").insert({
      org_id: orgId,
      donor_id: data.donor_id,
      amount: data.amount,
      donation_date: data.donation_date ?? new Date().toISOString().slice(0, 10),
      mode: data.mode ?? "cash",
      receipt_no: data.receipt_no ?? null,
      proof_url: data.proof_url ?? null,
      notes: data.notes ?? null,
      recorded_by: userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { donation_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("donations").delete().eq("id", data.donation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrgDonorThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { threshold: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { orgId } = await getOrgForUser(supabase, userId);
    if (!orgId) throw new Error("Organization కనపడలేదు");
    if (!(data.threshold >= 0)) throw new Error("Threshold తప్పు");
    const { error } = await supabase
      .from("organizations")
      .update({ donor_recognition_threshold: data.threshold })
      .eq("id", orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
