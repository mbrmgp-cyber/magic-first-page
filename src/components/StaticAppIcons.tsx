import { useEffect, useRef } from "react";
import mbrLogoAsset from "@/assets/mbr-logo.png.asset.json";
import { buildPaddedIconSet } from "@/lib/pad-icon";

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
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Skip MBR icon/manifest injection on Varadhi routes so magic-link opens
    // don't flash MBR branding before Varadhi content mounts.
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/varadhi")) {
      return;
    }
    let cancelled = false;
    (async () => {
      const set = await buildPaddedIconSet(MBR_LOGO_URL, "#000000");
      if (cancelled) return;

      const manifest = {
        name: "MBR APP",
        short_name: "MBR",
        description: "MBR APP",
        start_url: "/",
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

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      upsertLink("manifest", { href: url });
      upsertLink("apple-touch-icon", { href: set.apple180 });
      upsertLink("apple-touch-icon", { sizes: "180x180", href: set.apple180 });
      upsertLink("icon", { href: set.any192, type: "image/png" });
      upsertLink("shortcut icon", { href: set.any192 });
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return null;
}
