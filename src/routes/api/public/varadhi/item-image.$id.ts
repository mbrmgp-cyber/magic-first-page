import { createFileRoute } from "@tanstack/react-router";
import { VARADHI_SHARE_IMAGE } from "@/lib/app-hosts";

// Public listing photo for WhatsApp/social link previews. Crawlers have no
// session, so this streams the first photo of an existing, non-removed listing
// from the private bucket. Falls back to the Vaaradhi logo share image.
export const Route = createFileRoute("/api/public/varadhi/item-image/$id")({
  server: { handlers: { GET: async ({ params }) => {
    const fallback = () => new Response(null, { status: 302, headers: { Location: VARADHI_SHARE_IMAGE } });
    const id = params.id;
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) return fallback();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await supabaseAdmin
      .from("varadhi_listings").select("images").eq("id", id).maybeSingle();
    if (error || !item) return fallback();
    const { data: removal } = await supabaseAdmin
      .from("varadhi_post_removals").select("id").eq("target_type", "listing").eq("target_id", id).maybeSingle();
    if (removal) return fallback();
    const path = Array.isArray((item as any).images) ? (item as any).images[0] : null;
    if (!path || typeof path !== "string") return fallback();
    if (/^https?:\/\//.test(path)) {
      return new Response(null, { status: 302, headers: { Location: path } });
    }
    const { data: image, error: imageError } = await supabaseAdmin.storage.from("varadhi-listings").download(path);
    if (imageError || !image || image.size > 8 * 1024 * 1024) return fallback();
    const extension = path.split(".").pop()?.toLowerCase();
    const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    return new Response(image, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } } },
});
