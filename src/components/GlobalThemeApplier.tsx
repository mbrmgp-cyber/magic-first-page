import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrg, getMyMembership } from "@/lib/org.functions";
import { resolveTheme } from "@/lib/theme";

/**
 * Applies the organization's theme (colors + font) globally by overriding
 * the shadcn semantic CSS variables on <html>. All pages that use semantic
 * tokens (bg-background, bg-card, text-foreground, border, etc.) and most
 * hardcoded surface utilities will follow the active org theme.
 */
export function GlobalThemeApplier() {
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = resolveTheme(org);
    const root = document.documentElement;

    // Force dark mode wrapper so shadcn .dark variants apply
    root.classList.add("dark");
    root.dataset.mbrTheme = "on";

    // Map theme to shadcn semantic tokens. Using hex directly works because
    // Tailwind v4 reads --background etc. as plain CSS values.
    const vars: Record<string, string> = {
      "--mbr-theme-bg": t.bg,
      "--mbr-theme-card": t.box,
      "--mbr-theme-border": t.border,
      "--mbr-theme-primary": t.buttonBg,
      "--mbr-theme-primary-fg": t.buttonText,
      "--mbr-theme-heading": t.headColor,
      "--mbr-theme-muted": t.smallColor,
      "--mbr-theme-icon": t.icon,
      "--background": t.bg,
      "--foreground": t.headColor,
      "--card": t.box,
      "--card-foreground": t.headColor,
      "--popover": t.box,
      "--popover-foreground": t.headColor,
      "--primary": t.buttonBg,
      "--primary-foreground": t.buttonText,
      "--secondary": t.box,
      "--secondary-foreground": t.headColor,
      "--muted": t.box,
      "--muted-foreground": t.smallColor,
      "--accent": t.box,
      "--accent-foreground": t.headColor,
      "--border": t.border,
      "--input": t.border,
      "--ring": t.buttonBg,
      "--sidebar": t.box,
      "--sidebar-foreground": t.headColor,
      "--sidebar-border": t.border,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

    // Global font + base body colors
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.headColor;
    document.body.style.fontFamily = `${t.headFont}, system-ui, sans-serif`;

    // Inject high-specificity overrides for legacy pages that still use fixed
    // Tailwind colors (bg-black, bg-zinc-950, bg-white/95, text-white, etc.).
    // This is intentionally scoped to the authenticated app wrapper and avoids
    // exact bg-white/text-black so printable ID-card canvases keep their design.
    const styleId = "mbr-global-theme-overrides";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      html[data-mbr-theme="on"], html[data-mbr-theme="on"] body {
        background-color: var(--mbr-theme-bg) !important;
        color: var(--mbr-theme-heading) !important;
        font-family: ${JSON.stringify(t.headFont)}, system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app,
      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-screen"][class*="bg-black"],
      html[data-mbr-theme="on"] .mbr-themed-app .bg-tricolor,
      html[data-mbr-theme="on"] .mbr-themed-app .bg-tricolor-strong {
        background: var(--mbr-theme-bg) !important;
        color: var(--mbr-theme-heading) !important;
        font-family: ${JSON.stringify(t.headFont)}, system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app .bg-card,
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-zinc-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-slate-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-neutral-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-gray-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-white/"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="data-[state=active]:bg-[#ff8c28]"][data-state="active"] {
        background: var(--mbr-theme-card) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app button:not([class*="variant-ghost"]),
      html[data-mbr-theme="on"] .mbr-themed-app a[class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-primary"],
      html[data-mbr-theme="on"] .mbr-themed-app [role="tab"][data-state="active"] {
        background-color: var(--mbr-theme-primary) !important;
        border-color: var(--mbr-theme-primary) !important;
        color: var(--mbr-theme-primary-fg) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app input,
      html[data-mbr-theme="on"] .mbr-themed-app textarea,
      html[data-mbr-theme="on"] .mbr-themed-app select,
      html[data-mbr-theme="on"] .mbr-themed-app [role="combobox"] {
        background-color: color-mix(in srgb, var(--mbr-theme-card) 88%, var(--mbr-theme-bg)) !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app input::placeholder,
      html[data-mbr-theme="on"] .mbr-themed-app textarea::placeholder {
        color: color-mix(in srgb, var(--mbr-theme-muted) 72%, transparent) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-zinc"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-slate"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-neutral"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-gray"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-white"] {
        border-color: var(--mbr-theme-border) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-zinc-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-slate-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-neutral-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-gray-"] {
        color: var(--mbr-theme-muted) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class~="text-white"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-white/"] {
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app svg[class*="text-[#ff8c28]"] {
        color: var(--mbr-theme-icon) !important;
        border-color: var(--mbr-theme-icon) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app .shadow,
      html[data-mbr-theme="on"] .mbr-themed-app .shadow-xl,
      html[data-mbr-theme="on"] .mbr-themed-app [class*="shadow-"] {
        box-shadow: 0 10px 28px color-mix(in srgb, var(--mbr-theme-primary) 16%, transparent) !important;
      }
    `;
  }, [org]);

  return null;
}
