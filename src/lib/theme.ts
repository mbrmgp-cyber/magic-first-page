// Org-level theme settings shared across dashboards, ID cards, letter pads.

export type TextAlign = "left" | "center" | "right";

export type ThemeSettings = {
  bg?: string;          // page background
  box?: string;         // card / box fill
  bigBox?: string;      // large section/header box fill
  miniBox?: string;     // small tile/card fill
  border?: string;      // card / button border
  icon?: string;        // dashboard icon color
  buttonBg?: string;    // primary button fill
  buttonText?: string;  // primary button text
  inputBg?: string;     // input / textarea fill
  inputText?: string;   // input / textarea text color
  headColor?: string;   // big header text color
  headFont?: string;    // header font family
  subColor?: string;    // sub-title (slogan) color
  subFont?: string;     // sub-title font family
  smallColor?: string;  // small text color
  smallSize?: number;   // small text size px (10..16)
  headAlign?: TextAlign; // text alignment for headline block
};

export const DEFAULT_THEME: Required<ThemeSettings> = {
  bg: "#000000",
  box: "#0a0a0a",
  bigBox: "#0a0a0a",
  miniBox: "#0a0a0a",
  border: "#27272a",
  icon: "#ff8c28",
  buttonBg: "#ff8c28",
  buttonText: "#ffffff",
  inputBg: "#0a0a0a",
  inputText: "#ffffff",
  headColor: "#ffffff",
  headFont: "Inter",
  subColor: "#a1a1aa",
  subFont: "Inter",
  smallColor: "#a1a1aa",
  smallSize: 12,
  headAlign: "left",
};

export const HEAD_FONTS = [
  { label: "Modern (Inter)", value: "Inter" },
  { label: "Bold (Poppins)", value: "Poppins" },
  { label: "Serif (Playfair Display)", value: "Playfair Display" },
  { label: "Editorial (Merriweather)", value: "Merriweather" },
  { label: "Classic (Roboto Slab)", value: "Roboto Slab" },
  { label: "Clean (Noto Sans)", value: "Noto Sans" },
];

export const TEXT_ALIGNS: { value: TextAlign; en: string; te: string }[] = [
  { value: "left", en: "Left", te: "ఎడమ" },
  { value: "center", en: "Center", te: "మధ్యలో" },
  { value: "right", en: "Right", te: "కుడి" },
];

export function resolveTheme(org: any): Required<ThemeSettings> {
  const t: ThemeSettings = (org?.theme_settings as any) || {};
  const legacy = {
    icon: org?.theme_color,
    buttonBg: org?.theme_color,
    headFont: org?.theme_font,
  } as ThemeSettings;
  const merged = {
    ...DEFAULT_THEME,
    ...legacy,
    ...t,
  } as Required<ThemeSettings>;
  merged.bigBox = t.bigBox || t.box || merged.bigBox;
  merged.miniBox = t.miniBox || t.box || merged.miniBox;
  merged.box = t.box || merged.miniBox;
  return merged;
}

export function themeStyle(t: Required<ThemeSettings>): React.CSSProperties {
  return {
    ["--tbg" as any]: t.bg,
    ["--tbox" as any]: t.box,
    ["--tbigbox" as any]: t.bigBox,
    ["--tminibox" as any]: t.miniBox,
    ["--tborder" as any]: t.border,
    ["--ticon" as any]: t.icon,
    ["--tbtn" as any]: t.buttonBg,
    ["--tbtnText" as any]: t.buttonText,
    ["--thead" as any]: t.headColor,
    ["--tsub" as any]: t.subColor,
    ["--tsmall" as any]: t.smallColor,
    ["--tsmallSize" as any]: `${t.smallSize}px`,
    fontFamily: `${t.headFont}, system-ui, sans-serif`,
    backgroundColor: t.bg,
    color: t.headColor,
  };
}
