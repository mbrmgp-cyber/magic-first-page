import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureDonorAuthAndSendLink(donorId: string, emailRaw: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = emailRaw.trim().toLowerCase();
    let userId: string | null = null;
    for (let page = 1; page <= 20; page += 1) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      const u = list.users.find((x: any) => x.email?.toLowerCase() === email);
      if (u) { userId = u.id; break; }
      if (list.users.length < 1000) break;
    }
    if (!userId) {
      const { data: created } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "donor" },
      });
      userId = created?.user?.id ?? null;
    }
    if (userId) {
      await supabaseAdmin.from("donors").update({ user_id: userId }).eq("id", donorId);
    }
    const { createClient } = await import("@supabase/supabase-js");
    const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
    });
    const origin = process.env.PUBLIC_APP_URL || "https://mbrplatform.com";
    const { error: otpErr } = await pub.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/donor/dashboard`, shouldCreateUser: false },
    });
    if (otpErr) { console.error("[donor magic link]", otpErr.message); return { ok: false, error: otpErr.message }; }
    return { ok: true };
  } catch (e: any) {
    console.error("[donor magic link] failed", e);
    return { ok: false, error: e?.message || String(e) };
  }
}


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
    let linkSent = false;
    let linkError: string | null = null;
    if ((data.status ?? "approved") === "approved" && data.email?.trim()) {
      const r = await ensureDonorAuthAndSendLink(row.id, data.email);
      linkSent = r.ok;
      linkError = r.ok ? null : (r as any).error ?? null;
    }
    return { id: row.id, orgId, linkSent, linkError };
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
      return { ok: true };
    }
    // Approve: mark approved and best-effort create auth user + link
    const { data: donor, error: upErr } = await supabase
      .from("donors")
      .update({ status: "approved" })
      .eq("id", data.donor_id)
      .select("id, email, user_id")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);

    if (donor?.email && !donor.user_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = donor.email.trim().toLowerCase();
        // Try to find existing auth user
        let userId: string | null = null;
        for (let page = 1; page <= 20; page += 1) {
          const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) break;
          const u = list.users.find((x: any) => x.email?.toLowerCase() === email);
          if (u) { userId = u.id; break; }
          if (list.users.length < 1000) break;
        }
        if (!userId) {
          const { data: created } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: `MBR-${crypto.randomUUID()}`,
            email_confirm: true,
            user_metadata: { role: "donor" },
          });
          userId = created?.user?.id ?? null;
        }
        if (userId) {
          await supabaseAdmin.from("donors").update({ user_id: userId }).eq("id", donor.id);
        }
        // Send magic link to donor email so they can login without a password
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
          });
          const origin = process.env.PUBLIC_APP_URL || "https://mbrplatform.com";
          await pub.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${origin}/donor/dashboard`, shouldCreateUser: false },
          });
        } catch (e) {
          console.error("[reviewDonor] magic link send failed", e);
        }
      } catch (e) {
        // Don't fail approval if auth user creation fails; admin can retry
        console.error("[reviewDonor] auth link failed", e);
      }
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

function normalizeOrgCode(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const v = parsed?.code || parsed?.org_code || parsed?.orgCode;
    if (typeof v === "string" && v.trim()) return v.trim().toUpperCase();
  } catch {}
  try {
    const url = new URL(raw);
    const v = url.searchParams.get("code") || url.searchParams.get("org_code");
    if (v) return v.trim().toUpperCase();
  } catch {}
  const m = raw.match(/[?&](?:code|org_code)=([^&#]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]).trim().toUpperCase();
  return raw.toUpperCase();
}

export const submitDonorRequest = createServerFn({ method: "POST" })
  .inputValidator((d: {
    code: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    email: string;
    photo_data_url?: string;
    notes?: string;
  }) => d)
  .handler(async ({ data }) => {
    const code = normalizeOrgCode(data.code);
    if (!code) throw new Error("Invalid code");
    if (!data.first_name?.trim()) throw new Error("పేరు ఇవ్వండి");
    if (!data.email?.trim()) throw new Error("Email ఇవ్వండి");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .or(`org_code.eq.${code},letter_code.eq.${code}`)
      .maybeSingle();
    if (!org) throw new Error("Invalid QR / Code");

    let photo_url: string | null = null;
    if (data.photo_data_url?.startsWith("data:image/")) {
      const match = data.photo_data_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid photo file");
      const contentType = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Photo must be under 5MB");
      const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const path = `public-requests/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("member-photos")
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw new Error(upErr.message);
      photo_url = path;
    }

    const { data: donor, error } = await supabaseAdmin
      .from("donors")
      .insert({
        org_id: org.id,
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email.trim().toLowerCase(),
        photo_url,
        notes: data.notes?.trim() || null,
        status: "pending",
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { donor };
  });

export const getMyDonor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email?.toLowerCase?.() ?? null;

    // Try by user_id first, then by email
    let donor: any = null;
    const { data: byUser } = await supabase
      .from("donors")
      .select("*, organizations(id,name,logo_url,letter_code), linked_member:linked_member_id(id,name,member_code)")
      .eq("user_id", userId)
      .maybeSingle();
    donor = byUser;
    if (!donor && email) {
      // Bootstrap: donor row may not yet have user_id, so RLS as this user won't
      // see it. Use admin to find + self-link by email, then re-read as user.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: byEmail } = await supabaseAdmin
        .from("donors")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();
      if (byEmail && byEmail.status === "approved") {
        await supabaseAdmin.from("donors").update({ user_id: userId }).eq("id", byEmail.id);
        const { data: linked } = await supabase
          .from("donors")
          .select("*, organizations(id,name,logo_url,letter_code), linked_member:linked_member_id(id,name,member_code)")
          .eq("id", byEmail.id)
          .maybeSingle();
        donor = linked;
      } else if (byEmail) {
        // Return a minimal pending shape (fetched via admin) so UI can show "pending approval"
        const { data: pending } = await supabaseAdmin
          .from("donors")
          .select("*, organizations(id,name,logo_url,letter_code)")
          .eq("id", byEmail.id)
          .maybeSingle();
        donor = pending;
      }
    }
    if (!donor) return { donor: null, donations: [] };

    const { data: donations } = await supabase
      .from("donations")
      .select("*")
      .eq("donor_id", donor.id)
      .order("donation_date", { ascending: false });
    return { donor, donations: donations ?? [] };
  });

export const getDonorAuctionView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email?.toLowerCase?.() ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Locate donor (by user_id or email) and confirm approved
    let donor: any = null;
    const { data: byUser } = await supabase.from("donors").select("id, org_id, status").eq("user_id", userId).maybeSingle();
    donor = byUser;
    if (!donor && email) {
      const { data: byEmail } = await supabaseAdmin.from("donors").select("id, org_id, status").eq("email", email).maybeSingle();
      donor = byEmail;
    }
    if (!donor || donor.status !== "approved" || !donor.org_id) {
      return { session: null, groupName: null, orgId: null };
    }

    // Load active session via admin (donor is not org member; RLS would block)
    const { data: rows } = await supabaseAdmin
      .from("auction_sessions")
      .select("id, group_name, live_group_name, chit_value, total_months, current_month, commission_pct, start_date, auction_closed, status, winner_member_name, winner_member_code, winner_amount, winner_net, winner_dividend, past_winners, total_members, updated_at")
      .eq("org_id", donor.org_id)
      .order("updated_at", { ascending: false });
    const sessions = rows ?? [];
    const active = sessions.find((r: any) => r.status !== "closed" && !r.auction_closed) ?? sessions[0] ?? null;
    return { session: active, orgId: donor.org_id, groupName: active?.live_group_name || active?.group_name || null };
  });

export const getDonorActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email?.toLowerCase?.() ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let donor: any = null;
    const { data: byUser } = await supabase.from("donors").select("id, org_id, status").eq("user_id", userId).maybeSingle();
    donor = byUser;
    if (!donor && email) {
      const { data: byEmail } = await supabaseAdmin.from("donors").select("id, org_id, status").eq("email", email).maybeSingle();
      donor = byEmail;
    }
    if (!donor || donor.status !== "approved" || !donor.org_id) {
      return { activities: [], milestones: [] };
    }

    const { data: activities } = await supabaseAdmin
      .from("org_activities")
      .select("id, event_name, event_date, description, status, allocated_budget, actual_expense")
      .eq("org_id", donor.org_id)
      .order("event_date", { ascending: false })
      .limit(50);
    const { data: milestones } = await supabaseAdmin
      .from("org_milestones")
      .select("id, title, description, event_date, photo_url")
      .eq("org_id", donor.org_id)
      .order("event_date", { ascending: false })
      .limit(20);
    return { activities: activities ?? [], milestones: milestones ?? [] };
  });


