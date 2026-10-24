import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { appForHostname } from "@/lib/app-hosts";

const MAIN_ORIGIN = "https://mbrplatform.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static public indexable routes, grouped per app.
const MBR_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/mbr", changefreq: "monthly", priority: "0.9" },
  { path: "/member/register", changefreq: "monthly", priority: "0.4" },
  { path: "/org/register", changefreq: "monthly", priority: "0.4" },
  { path: "/donor/register", changefreq: "monthly", priority: "0.4" },
];

const VARADHI_ENTRIES: SitemapEntry[] = [
  { path: "/varadhi", changefreq: "daily", priority: "0.9" },
  { path: "/varadhi/browse/fresh", changefreq: "daily", priority: "0.8" },
  { path: "/varadhi/browse/new", changefreq: "daily", priority: "0.8" },
  { path: "/varadhi/browse/used", changefreq: "daily", priority: "0.8" },
  { path: "/varadhi/browse/realestate", changefreq: "weekly", priority: "0.8" },
  { path: "/varadhi/browse/transport", changefreq: "weekly", priority: "0.7" },
  { path: "/varadhi/browse/services", changefreq: "weekly", priority: "0.7" },
  { path: "/varadhi/rewards", changefreq: "monthly", priority: "0.5" },
  { path: "/varadhi/subscription", changefreq: "monthly", priority: "0.5" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Resolve the requesting host so each app domain gets its own sitemap.
        // Only the local development proxy supplies x-forwarded-host.
        const reqUrl = new URL(request.url);
        const forwarded = reqUrl.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
        const hostname = (forwarded ?? reqUrl.hostname).toLowerCase();
        const app = appForHostname(hostname);
        const origin = app ? `https://${hostname}` : MAIN_ORIGIN;

        const entries: SitemapEntry[] =
          app === "mbr"
            ? [...MBR_ENTRIES]
            : app === "varadhi"
              ? [...VARADHI_ENTRIES]
              : [...MBR_ENTRIES, ...VARADHI_ENTRIES];

        // Fetch dynamic Vaaradhi listings + providers via the service-role
        // client (bypasses RLS). Loaded inside the handler so the client-only
        // server module never reaches the browser bundle. Skipped on the MBR
        // app domain, whose sitemap lists MBR pages only.
        if (app !== "mbr") try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const [listings, providers] = await Promise.all([
            supabaseAdmin
              .from("varadhi_listings")
              .select("id, updated_at")
              .neq("stock_status", "closed")
              .order("updated_at", { ascending: false }),
            supabaseAdmin
              .from("varadhi_providers")
              .select("id, updated_at")
              .eq("availability_status", "online")
              .order("updated_at", { ascending: false }),
          ]);

          for (const row of listings.data ?? []) {
            entries.push({
              path: `/varadhi/item/${row.id}`,
              lastmod: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }

          for (const row of providers.data ?? []) {
            entries.push({
              path: `/varadhi/provider/${row.id}`,
              lastmod: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (err) {
          // If the DB is unreachable, still serve the static entries.
          console.error("[sitemap] dynamic fetch failed:", err);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${origin}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
