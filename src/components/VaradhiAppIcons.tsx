import { useEffect } from "react";

const VARADHI_MANIFEST = "/varadhi-manifest.webmanifest";
const VARADHI_ICON_192 = "/varadhi-icon-192.png";
const VARADHI_APPLE_ICON = "/varadhi-apple-touch-icon.png";
const THEME_COLOR = "#1e3a8a";

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

/** Installs Varadhi-branded PWA icons + manifest on all /varadhi routes. */
export function VaradhiAppIcons() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    upsertLink("manifest", { href: VARADHI_MANIFEST });
    upsertLink("apple-touch-icon", { href: VARADHI_APPLE_ICON });
    upsertLink("apple-touch-icon", { sizes: "180x180", href: VARADHI_APPLE_ICON });
    upsertLink("icon", { href: VARADHI_ICON_192, type: "image/png" });
    upsertLink("shortcut icon", { href: VARADHI_ICON_192 });

    const themeMeta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = THEME_COLOR;
    const appName = document.head.querySelector<HTMLMetaElement>('meta[name="application-name"]');
    if (appName) appName.content = "Vaaradhi";
    const appleTitle = document.head.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = "Vaaradhi";
  }, []);

  return null;
}
