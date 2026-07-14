import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public lookup by member_code — returns only safe fields for ID-card
// verification. No auth required. Uses admin client to bypass RLS but
// exposes a strictly whitelisted projection.
export const verifyMemberByCode = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("members")
      .select("id, org_id, name, first_name, last_name, member_code, photo_url, is_active, status, joined_date")
      .eq("member_code", data.code)
      .maybeSingle();
    if (!m || m.status !== "approved") return { member: null, org: null, photoUrl: null };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url, theme_color, org_code")
      .eq("id", m.org_id)
      .maybeSingle();

    let photoUrl: string | null = null;
    if (m.photo_url) {
      if (/^https?:\/\//i.test(m.photo_url) || m.photo_url.startsWith("data:")) {
        photoUrl = m.photo_url;
      } else {
        const { data: signed } = await supabaseAdmin.storage
          .from("member-photos")
          .createSignedUrl(m.photo_url, 3600);
        photoUrl = signed?.signedUrl ?? null;
      }
    }
    return { member: m, org, photoUrl };
  });
