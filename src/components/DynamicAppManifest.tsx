import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrg, getMyMembership } from "@/lib/org.functions";
import { resolveTheme } from "@/lib/theme";
import mbrLogoAsset from "@/assets/mbr-logo.png.asset.json";
import { buildPaddedIconSet } from "@/lib/pad-icon";

const MBR_LOGO_URL = mbrLogoAsset.url;

/**
 * Injects a per-tenant Web App Manifest + Apple touch icon so that when a user
 * adds the app to their phone home screen, they see THEIR organization's logo
 * and short name (e.g. "C H S") instead of the default Lovable "L".
 *
 * - Builds a manifest JSON in-memory and serves it via a blob: URL.
 * - Updates <link rel="manifest">, apple-touch-icon, theme-color and the
 *   apple-mobile-web-app-title meta on every org/theme change.
 */
function acronymOf(name?: string | null, letterCode?: string | null): string {
  const lc = (letterCode || "").trim();
  if (lc) {
    // "CHS" -> "C H S"; preserve existing spaces.
    return lc.includes(" ") ? lc.toUpperCase() : lc.toUpperCase().split("").join(" ");
  }
  const n = (name || "MBR APP").trim();
  const letters = n
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 4)
    .join(" ")
    .toUpperCase();
  return letters || "MBR";
}

function upsertLink(rel: string, attrs: Record<string, string>) {
  const selector = `link[rel="${rel}"]${attrs.sizes ? `[sizes="${attrs.sizes}"]` : ""}`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function DynamicAppManifest() {
  const fetchOrg = useServerFn(getMyOrg);
  const fetchMembership = useServerFn(getMyMembership);

  const orgQ = useQuery({
    queryKey: ["my-org"],
    queryFn: () => fetchOrg(),
    staleTime: 60_000,
  });
  const memberQ = useQuery({
    queryKey: ["my-membership"],
    queryFn: () => fetchMembership(),
    enabled: !orgQ.data?.org,
    staleTime: 60_000,
  });

  const org =
    (orgQ.data?.org as any) ||
    ((memberQ.data?.membership as any)?.organizations as any) ||
    null;

  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined" || !org) return;

    const theme = resolveTheme(org);
    const name = (org.name || "MBR APP").trim();
    const shortName = acronymOf(org.name, org.letter_code);
    const rawLogo = (org.logo_url || "").trim() || MBR_LOGO_URL;
    // Maskable safe-zone background: prefer white when the logo is likely
    // dark-on-light (org logos), else use the theme background.
    const iconBg = (org.logo_url || "").trim() ? "#ffffff" : theme.bg || "#000000";

    let cancelled = false;
    (async () => {
      const set = await buildPaddedIconSet(rawLogo, iconBg);
      if (cancelled) return;

      const icons = [
        { src: set.any192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: set.any512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: set.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

      const manifest = {
        name,
        short_name: shortName,
        description: name,
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: iconBg,
        theme_color: theme.bg,
        icons,
      };

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      upsertLink("manifest", { href: url });
      upsertLink("apple-touch-icon", { href: set.apple180 });
      upsertLink("apple-touch-icon", { sizes: "180x180", href: set.apple180 });
      upsertLink("icon", { href: set.any192, type: "image/png" });
      upsertLink("shortcut icon", { href: set.any192 });
      upsertMeta("apple-mobile-web-app-title", shortName);
      upsertMeta("application-name", shortName);
      upsertMeta("apple-mobile-web-app-capable", "yes");
      upsertMeta("mobile-web-app-capable", "yes");
      upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
      upsertMeta("theme-color", theme.bg);

      if (document.title && !document.title.includes(name)) {
        document.title = `${name} — MBR APP`;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return null;
}
