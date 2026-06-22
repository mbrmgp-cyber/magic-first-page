// Org-level theme settings shared across dashboards, ID cards, letter pads.

export type ThemeSettings = {
  bg?: string;          // page background
  box?: string;         // card / box fill
  border?: string;      // card / button border
  icon?: string;        // dashboard icon color
  buttonBg?: string;    // primary button fill
  buttonText?: string;  // primary button text
  headColor?: string;   // big header text color
  headFont?: string;    // header font family
  smallColor?: string;  // small text color
  smallSize?: number;   // small text size px (10..16)
};

export const DEFAULT_THEME: Required<ThemeSettings> = {
  bg: "#000000",
  box: "#0a0a0a",
  border: "#27272a",
  icon: "#ff8c28",
  buttonBg: "#ff8c28",
  buttonText: "#ffffff",
  headColor: "#ffffff",
  headFont: "Inter",
  smallColor: "#a1a1aa",
  smallSize: 12,
};

export const HEAD_FONTS = [
  { label: "Modern (Inter)", value: "Inter" },
  { label: "Bold (Poppins)", value: "Poppins" },
  { label: "Serif (Playfair Display)", value: "Playfair Display" },
  { label: "Editorial (Merriweather)", value: "Merriweather" },
  { label: "Classic (Roboto Slab)", value: "Roboto Slab" },
  { label: "Clean (Noto Sans)", value: "Noto Sans" },
];

export function resolveTheme(org: any): Required<ThemeSettings> {
  const t: ThemeSettings = (org?.theme_settings as any) || {};
  const legacy = {
    icon: org?.theme_color,
    buttonBg: org?.theme_color,
    headFont: org?.theme_font,
  } as ThemeSettings;
  return {
    ...DEFAULT_THEME,
    ...legacy,
    ...t,
  } as Required<ThemeSettings>;
}

export function themeStyle(t: Required<ThemeSettings>): React.CSSProperties {
  return {
    ["--tbg" as any]: t.bg,
    ["--tbox" as any]: t.box,
    ["--tborder" as any]: t.border,
    ["--ticon" as any]: t.icon,
    ["--tbtn" as any]: t.buttonBg,
    ["--tbtnText" as any]: t.buttonText,
    ["--thead" as any]: t.headColor,
    ["--tsmall" as any]: t.smallColor,
    ["--tsmallSize" as any]: `${t.smallSize}px`,
    fontFamily: `${t.headFont}, system-ui, sans-serif`,
    backgroundColor: t.bg,
    color: t.headColor,
  };
}
