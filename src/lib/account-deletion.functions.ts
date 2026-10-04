import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the signed-in user's own account and personal data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Personal data first (best effort; financial history keeps rows, name removed).
    await sb.from("varadhi_listings").delete().eq("seller_id", userId);
    await sb.from("varadhi_providers").delete().eq("user_id", userId);
    await sb.from("varadhi_profiles").delete().eq("user_id", userId);
    await sb
      .from("members")
      .update({ user_id: null, name: "Deleted member", email: null, phone: null, photo_url: null, is_active: false })
      .eq("user_id", userId);
    await sb.from("user_roles").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      // Linked records block a hard delete: lock the login permanently instead.
      const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
        email: `deleted-${userId}@deleted.mbrplatform.com`,
        user_metadata: { deleted: true },
      } as any);
      if (banErr) throw new Error("Could not delete account. Please email mbrplatform@gmail.com.");
    }
    return { ok: true as const };
  });
