import { useEffect } from "react";
import { getOrgBranding } from "@/lib/org-branding";
import { appForHostname, appManifestPath } from "@/lib/app-hosts";

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

    upsertLink("manifest", { href: appManifestPath(window.location.hostname, window.location.pathname) });
    upsertLink("apple-touch-icon", { href: "/mbr-apple-v2.png" });
    upsertLink("apple-touch-icon", { sizes: "180x180", href: "/mbr-apple-v2.png" });
    upsertLink("icon", { href: "/mbr-icon-192-v2.png", type: "image/png" });
    upsertLink("shortcut icon", { href: "/mbr-icon-192-v2.png" });
  }, []);

  return null;
}
