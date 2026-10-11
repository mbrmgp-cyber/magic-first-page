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
  headSize?: number;    // head title size px (16..48)
  subSize?: number;     // sub-title size px (12..32)
  headAlign?: TextAlign; // text alignment for headline block
};

export const DEFAULT_THEME: Required<ThemeSettings> = {
  bg: "#0f1b3d",
  box: "#1e3a5f",
  bigBox: "#172a4d",
  miniBox: "#1e3a5f",
  border: "#c9a84c66",
  icon: "#c9a84c",
  buttonBg: "#c9a84c",
  buttonText: "#0f1b3d",
  inputBg: "#172a4d",
  inputText: "#f5f0e0",
  headColor: "#f5f0e0",
  headFont: "Inter",
  subColor: "#c9a84c",
  subFont: "Inter",
  smallColor: "#b8c4d9",
  smallSize: 12,
  headSize: 24,
  subSize: 14,
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
  // Older saved themes had only one `box` color. Some organizations also have
  // saved default bigBox/miniBox values from before these controls were visible,
  // so treat a non-default legacy `box` as the selected box color unless the
  // newer fields were explicitly changed away from the default.
  const legacyBox = t.box && t.box !== DEFAULT_THEME.box ? t.box : undefined;
  merged.bigBox = (t.bigBox && t.bigBox !== DEFAULT_THEME.bigBox ? t.bigBox : undefined) || legacyBox || t.bigBox || merged.bigBox;
  merged.miniBox = (t.miniBox && t.miniBox !== DEFAULT_THEME.miniBox ? t.miniBox : undefined) || legacyBox || t.miniBox || merged.miniBox;
  merged.box = t.box || merged.miniBox;
  merged.inputBg = t.inputBg || merged.miniBox;
  merged.inputText = t.inputText || merged.headColor;
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
    ["--theadSize" as any]: `${t.headSize}px`,
    ["--tsubSize" as any]: `${t.subSize}px`,
    fontFamily: `${t.headFont}, system-ui, sans-serif`,
    backgroundColor: t.bg,
    color: t.headColor,
  };
}
