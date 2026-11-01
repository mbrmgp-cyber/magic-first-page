import { useEffect } from "react";
import mbrLogoAsset from "@/assets/mbr-logo.png.asset.json";
import { buildPaddedIconSet } from "@/lib/pad-icon";
import { toManifestDataUrl } from "@/lib/manifest-url";
import { getOrgBranding } from "@/lib/org-branding";
import { appForHostname } from "@/lib/app-hosts";

const MBR_LOGO_URL = mbrLogoAsset.url;

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

/**
 * Pads the default MBR logo into safe-zone icons on every route (including
 * public routes where DynamicAppManifest does not mount). DynamicAppManifest
 * later overrides these with org-specific padded icons when an org is loaded.
 */
export function StaticAppIcons() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    // The platform portal keeps its own server-rendered logo, not MBR APP icons.
    if (window.location.pathname === "/" && appForHostname(window.location.hostname) === null) return;
    // Skip MBR icon/manifest injection on Varadhi routes so magic-link opens
    // don't flash MBR branding before Varadhi content mounts.
    if (typeof window !== "undefined" && (window.location.pathname.startsWith("/varadhi") || appForHostname(window.location.hostname) === "varadhi")) {
      return;
    }
    // If the user's organization branding is already known, let it win.
    if (getOrgBranding()) return;

    let cancelled = false;
    (async () => {
      const set = await buildPaddedIconSet(MBR_LOGO_URL, "#000000");
      if (cancelled) return;

      const manifest = {
        name: "MBR APP",
        short_name: "MBR",
        description: "MBR APP",
        start_url: "/mbr",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: set.any192, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: set.any512, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: set.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };

      upsertLink("manifest", { href: toManifestDataUrl(manifest) });
      upsertLink("apple-touch-icon", { href: set.apple180 });
      upsertLink("apple-touch-icon", { sizes: "180x180", href: set.apple180 });
      upsertLink("icon", { href: set.any192, type: "image/png" });
      upsertLink("shortcut icon", { href: set.any192 });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
