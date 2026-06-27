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

    // Map theme to shadcn semantic tokens. Using hex directly works because
    // Tailwind v4 reads --background etc. as plain CSS values.
    const vars: Record<string, string> = {
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

    // Inject overrides that flatten legacy hardcoded surfaces so every
    // sub-page picks up the active palette consistently.
    const styleId = "mbr-global-theme-overrides";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      html, body { background-color: ${t.bg} !important; color: ${t.headColor} !important; font-family: ${t.headFont}, system-ui, sans-serif; }
      .bg-tricolor, .bg-tricolor-strong { background: ${t.bg} !important; color: ${t.headColor} !important; }
    `;
  }, [org]);

  return null;
}
