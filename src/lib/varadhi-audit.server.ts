// Server-only helper: append an entry to the Vaaradhi admin audit trail.
export type AdminAuditEntry = {
  action: string;
  actor_user_id: string;
  request_id?: string | null;
  target_user_id?: string | null;
  seat_id?: string | null;
  state?: string | null;
  district?: string | null;
  mandal?: string | null;
  before_data?: unknown;
  after_data?: unknown;
  notes?: string | null;
};

export async function logAdminAudit(entry: AdminAuditEntry) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("varadhi_admin_audit").insert({
      action: entry.action,
      actor_user_id: entry.actor_user_id,
      request_id: entry.request_id ?? null,
      target_user_id: entry.target_user_id ?? null,
      seat_id: entry.seat_id ?? null,
      state: entry.state ?? null,
      district: entry.district ?? null,
      mandal: entry.mandal ?? null,
      before_data: (entry.before_data ?? null) as never,
      after_data: (entry.after_data ?? null) as never,
      notes: entry.notes ? entry.notes.slice(0, 500) : null,
    } as never);
  } catch {
    // Audit logging must never break the admin action itself.
  }
}
