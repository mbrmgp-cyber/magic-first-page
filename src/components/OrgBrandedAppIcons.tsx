import { useEffect } from "react";
import { buildPaddedIconSet } from "@/lib/pad-icon";
import { toManifestDataUrl } from "@/lib/manifest-url";
import { getOrgBranding, orgStartUrl } from "@/lib/org-branding";


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

/**
 * Public-screen counterpart of DynamicAppManifest: uses the remembered
 * organization branding so a member can save the app to their home screen
 * with their own organization logo, even before signing in.
 */
export function OrgBrandedAppIcons() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const b = getOrgBranding();
    if (!b) return;

    let cancelled = false;
    (async () => {
      const set = await buildPaddedIconSet(b.logoUrl, b.iconBg || "#ffffff");
      if (cancelled) return;

      const manifest = {
        name: b.name,
        short_name: b.shortName,
        description: b.name,
        start_url: orgStartUrl(b.orgCode),
        scope: `${window.location.origin}/`,
        display: "standalone",
        orientation: "portrait",
        background_color: b.iconBg || "#ffffff",
        theme_color: b.bg || "#000000",
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
      upsertMeta("apple-mobile-web-app-title", b.shortName);
      upsertMeta("application-name", b.shortName);
      upsertMeta("apple-mobile-web-app-capable", "yes");
      upsertMeta("mobile-web-app-capable", "yes");
      if (b.name) document.title = b.name;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

