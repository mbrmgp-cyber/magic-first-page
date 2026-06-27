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
      "--mbr-theme-card": t.miniBox,
      "--mbr-theme-big-card": t.bigBox,
      "--mbr-theme-mini-card": t.miniBox,
      "--mbr-theme-border": t.border,
      "--mbr-theme-primary": t.buttonBg,
      "--mbr-theme-primary-fg": t.buttonText,
      "--mbr-theme-heading": t.headColor,
      "--mbr-theme-muted": t.smallColor,
      "--mbr-theme-icon": t.icon,
      "--mbr-theme-input-bg": t.inputBg,
      "--mbr-theme-input-text": t.inputText,
      "--background": t.bg,
      "--foreground": t.headColor,
      "--card": t.miniBox,
      "--card-foreground": t.headColor,
      "--popover": t.bigBox,
      "--popover-foreground": t.headColor,
      "--primary": t.buttonBg,
      "--primary-foreground": t.buttonText,
      "--secondary": t.miniBox,
      "--secondary-foreground": t.headColor,
      "--muted": t.miniBox,
      "--muted-foreground": t.smallColor,
      "--accent": t.miniBox,
      "--accent-foreground": t.headColor,
      "--border": t.border,
      "--input": t.border,
      "--ring": t.buttonBg,
      "--sidebar": t.bigBox,
      "--sidebar-foreground": t.headColor,
      "--sidebar-border": t.border,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

    // Global font + base body colors
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.headColor;
    document.body.style.fontFamily = `${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif`;

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
        font-family: ${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app,
      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-screen"][class*="bg-black"],
      html[data-mbr-theme="on"] .mbr-themed-app .bg-tricolor,
      html[data-mbr-theme="on"] .mbr-themed-app .bg-tricolor-strong {
        background: var(--mbr-theme-bg) !important;
        color: var(--mbr-theme-heading) !important;
        font-family: ${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app :not(.mbr-preserve-design):not(.mbr-preserve-design *):not(svg):not(path) {
        font-family: ${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-theme-big-box,
      html[data-mbr-theme="on"] .mbr-themed-app .mbr-theme-big-box,
      html[data-mbr-theme="on"] [role="dialog"] .mbr-theme-big-box {
        background: var(--mbr-theme-big-card) !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-theme-mini-box,
      html[data-mbr-theme="on"] .mbr-themed-app .mbr-theme-mini-box,
      html[data-mbr-theme="on"] [role="dialog"] .mbr-theme-mini-box {
        background: var(--mbr-theme-mini-card) !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="background"] {
        background: var(--mbr-theme-bg) !important;
        background-color: var(--mbr-theme-bg) !important;
        background-image: none !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="big-box"] {
        background: var(--mbr-theme-big-card) !important;
        background-color: var(--mbr-theme-big-card) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="mini-box"] {
        background: var(--mbr-theme-mini-card) !important;
        background-color: var(--mbr-theme-mini-card) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app .bg-card,
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-black"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-zinc-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-slate-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-neutral-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-gray-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-white/"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-orange-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-amber-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-emerald-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-green-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-red-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-gradient-to-"]:not([class*="bg-clip-text"]),
      html[data-mbr-theme="on"] .mbr-themed-app [class*="from-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="to-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="via-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="from-orange-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="to-green-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="data-[state=active]:bg-[#ff8c28]"][data-state="active"],
      html[data-mbr-theme="on"] [role="dialog"][class*="bg-black"],
      html[data-mbr-theme="on"] [role="dialog"][class*="bg-zinc-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-black"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-zinc-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-slate-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-gray-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-white/"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-orange-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-amber-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-emerald-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-green-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-blue-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-red-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="bg-gradient-to-"]:not([class*="bg-clip-text"]) {
        background: var(--mbr-theme-mini-card) !important;
        background-image: none !important;
        color: var(--mbr-theme-heading) !important;
      }

      /* Full-page wrappers must always use the Background setting, not the
         Box/Mini Box setting. This prevents pages with old bg-blue/bg-gradient
         classes from swapping the selected background and box colors. */
      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-screen"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-dvh"] {
        background: var(--mbr-theme-bg) !important;
        background-image: none !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [style*="linear-gradient"]:not(.mbr-preserve-design):not(.mbr-preserve-design *):not([style*="background-clip"]):not([style*="BackgroundClip"]),
      html[data-mbr-theme="on"] [role="dialog"] [style*="linear-gradient"]:not([style*="background-clip"]):not([style*="BackgroundClip"]) {
        background: var(--mbr-theme-primary) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-primary) !important;
        color: var(--mbr-theme-primary-fg) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-screen"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="min-h-dvh"] {
        background: var(--mbr-theme-bg) !important;
        background-image: none !important;
        color: var(--mbr-theme-heading) !important;
      }

      /* Authoritative surface mapping: Settings Background → page,
         Big Box → large panels, Mini Box → small cards. Keep this after
         legacy bg/gradient overrides so old Tailwind classes cannot invert it. */
      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="background"] {
        background: var(--mbr-theme-bg) !important;
        background-color: var(--mbr-theme-bg) !important;
        background-image: none !important;
        color: var(--mbr-theme-heading) !important;
      }
      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="big-box"] {
        background: var(--mbr-theme-big-card) !important;
        background-color: var(--mbr-theme-big-card) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }
      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-surface="mini-box"] {
        background: var(--mbr-theme-mini-card) !important;
        background-color: var(--mbr-theme-mini-card) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-primary"],
      html[data-mbr-theme="on"] .mbr-themed-app a[class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-orange-"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-amber-"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-emerald-"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-green-"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app button[class*="bg-red-"],
      html[data-mbr-theme="on"] .mbr-themed-app .btn-saffron-green,
      html[data-mbr-theme="on"] .mbr-themed-app [role="tab"][data-state="active"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-orange-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-amber-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-emerald-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-green-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-blue-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-red-"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-[#ff8c28]"],
      html[data-mbr-theme="on"] [role="dialog"] button[class*="bg-primary"] {
        background-color: var(--mbr-theme-primary) !important;
        background-image: none !important;
        border-color: var(--mbr-theme-primary) !important;
        color: var(--mbr-theme-primary-fg) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app input,
      html[data-mbr-theme="on"] .mbr-themed-app textarea,
      html[data-mbr-theme="on"] .mbr-themed-app select,
      html[data-mbr-theme="on"] .mbr-themed-app [role="combobox"],
      html[data-mbr-theme="on"] [role="dialog"] input,
      html[data-mbr-theme="on"] [role="dialog"] textarea,
      html[data-mbr-theme="on"] [role="dialog"] select,
      html[data-mbr-theme="on"] [role="dialog"] [role="combobox"] {
        background-color: var(--mbr-theme-input-bg) !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-input-text) !important;
        -webkit-text-fill-color: var(--mbr-theme-input-text) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app input::placeholder,
      html[data-mbr-theme="on"] .mbr-themed-app textarea::placeholder {
        color: color-mix(in srgb, var(--mbr-theme-muted) 72%, transparent) !important;
        -webkit-text-fill-color: color-mix(in srgb, var(--mbr-theme-muted) 72%, transparent) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app input[type="color"] {
        background-color: transparent !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-preserve],
      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-preserve] * {
        forced-color-adjust: none;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-preserve="card"],
      html[data-mbr-theme="on"] .mbr-themed-app [data-theme-preserve="card"] * {
        forced-color-adjust: none;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-zinc"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-slate"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-neutral"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-gray"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-white"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="border-zinc"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="border-slate"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="border-gray"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="border-white"] {
        border-color: var(--mbr-theme-border) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-zinc-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-slate-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-neutral-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-gray-"] {
        color: var(--mbr-theme-muted) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-orange-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-amber-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-blue-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-green-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-emerald-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-red-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-rose-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-orange-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-amber-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-blue-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-green-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-emerald-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-red-"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-rose-"] {
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class~="text-white"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-white/"],
      html[data-mbr-theme="on"] [role="dialog"] [class~="text-white"],
      html[data-mbr-theme="on"] [role="dialog"] [class*="text-white/"] {
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] [role="dialog"] {
        background: var(--mbr-theme-big-card) !important;
        border-color: var(--mbr-theme-border) !important;
        color: var(--mbr-theme-heading) !important;
        font-family: ${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app [class*="border-[#ff8c28]"],
      html[data-mbr-theme="on"] .mbr-themed-app svg[class*="text-[#ff8c28]"] {
        color: var(--mbr-theme-icon) !important;
        border-color: var(--mbr-theme-icon) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app :not(svg)[class*="text-[#ff8c28]"] {
        color: var(--mbr-theme-heading) !important;
      }

      html[data-mbr-theme="on"] .mbr-themed-app svg {
        color: var(--mbr-theme-icon) !important;
      }

      /* Kill hardcoded saffron→green text-clip gradients on sub-pages so
         titles always use the selected head color. */
      html[data-mbr-theme="on"] .mbr-themed-app [class*="bg-clip-text"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="text-transparent"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="from-orange-"][class*="to-"],
      html[data-mbr-theme="on"] .mbr-themed-app [class*="from-[#"][class*="to-[#"],
      html[data-mbr-theme="on"] .mbr-themed-app [style*="-webkit-background-clip"]:not(.mbr-preserve-design):not(.mbr-preserve-design *),
      html[data-mbr-theme="on"] .mbr-themed-app [style*="background-clip: text"]:not(.mbr-preserve-design):not(.mbr-preserve-design *),
      html[data-mbr-theme="on"] .mbr-themed-app [style*="background-clip:text"]:not(.mbr-preserve-design):not(.mbr-preserve-design *) {
        background-image: none !important;
        background: transparent !important;
        -webkit-text-fill-color: var(--mbr-theme-heading) !important;
        color: var(--mbr-theme-heading) !important;
        font-family: ${JSON.stringify(t.headFont)}, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif !important;
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
