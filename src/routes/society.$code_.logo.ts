import { createFileRoute } from "@tanstack/react-router";
import { getOrganizationShareBranding } from "@/lib/organization-share.functions";
import { organizationLogoPath } from "@/lib/organization-share";

export const Route = createFileRoute("/society/$code_/logo")({
  server: { handlers: { GET: async ({ params }) => {
    const branding = await getOrganizationShareBranding({ data: { code: params.code } });
    if (!branding?.has_logo) return new Response("Logo unavailable", { status: 404 });
    // Privileged access is restricted to this approved society's logo, never documents or member photos.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await supabaseAdmin.from("organizations").select("logo_url")
      .eq("id", branding.id).eq("approval_status", "approved").maybeSingle();
    const origin = process.env['SUPABASE_URL']!;
    const path = org?.logo_url ? organizationLogoPath(org.logo_url, origin) : null;
    if (error || !path) return new Response("Logo unavailable", { status: 404 });
    const { data: image, error: imageError } = await supabaseAdmin.storage.from("org-documents").download(path);
    if (imageError || !image || image.size > 5 * 1024 * 1024) return new Response("Logo unavailable", { status: 404 });
    const extension = path.split(".").pop()?.toLowerCase();
    const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    return new Response(image, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } } },
});