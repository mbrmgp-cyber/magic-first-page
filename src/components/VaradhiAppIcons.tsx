import { useEffect, useRef } from "react";
import varadhiLogoAsset from "@/assets/varadhi-logo.jpg.asset.json";
import { buildPaddedIconSet } from "@/lib/pad-icon";

const VARADHI_LOGO_URL = varadhiLogoAsset.url;
const BG = "#ffffff";

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
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;
    (async () => {
      const set = await buildPaddedIconSet(VARADHI_LOGO_URL, BG);
      if (cancelled) return;

      const manifest = {
        name: "VARADHI (వారధి)",
        short_name: "Varadhi",
        description: "Varadhi — Sell, Buy, Transport & Local Services",
        start_url: "/varadhi",
        scope: "/varadhi",
        display: "standalone",
        orientation: "portrait",
        background_color: BG,
        theme_color: "#1e3a8a",
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
