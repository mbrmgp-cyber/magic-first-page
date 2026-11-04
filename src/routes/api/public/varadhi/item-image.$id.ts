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
    // WhatsApp silently drops preview images larger than ~600 KB, so serve a
    // resized share copy; never send the full-size phone photo.
    const MAX_SHARE_BYTES = 550 * 1024;
    const bucket = supabaseAdmin.storage.from("varadhi-listings");
    let image: Blob | null = null;
    for (const transform of [
      { width: 800, height: 800, resize: "cover" as const, quality: 70 },
      { width: 600, height: 600, resize: "cover" as const, quality: 55 },
    ]) {
      const { data, error: transformError } = await bucket.download(path, { transform });
      if (!transformError && data && data.size > 0 && data.size <= MAX_SHARE_BYTES) { image = data; break; }
    }
    if (!image) {
      const { data: original } = await bucket.download(path);
      if (original && original.size <= MAX_SHARE_BYTES) image = original;
    }
    if (!image) return fallback();
    const blobType = image.type && image.type.startsWith("image/") ? image.type : "";
    const extension = path.split(".").pop()?.toLowerCase();
    const type = blobType || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
    return new Response(image, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } } },
});
