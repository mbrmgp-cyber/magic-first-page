export function appForHostname(hostname: string): "mbr" | "varadhi" | null {
  switch (hostname.toLowerCase()) {
    case "mbr.mbrplatform.com": return "mbr";
    case "vaaradhi.mbrplatform.com": return "varadhi";
    default: return null;
  }
}

export function appEntryPath(hostname: string) {
  const app = appForHostname(hostname);
  return app === "mbr" ? "/mbr" : app === "varadhi" ? "/varadhi" : null;
}

export function appPageUrl(hostname: string, path: string) {
  const app = appForHostname(hostname);
  const origin = app ? `https://${hostname.toLowerCase()}` : "https://mbrplatform.com";
  return `${origin}${path}`;
}

export interface AppBranding {
  title: string;
  description: string;
  orgName: string;
  orgUrl: string;
  logoPath: string;
}

const MBR_BRANDING: AppBranding = {
  title: "MBR APP — Member Based Registry",
  description:
    "MBR APP — సంఘాలు, సభ్యులు, చిట్టీలు, రుణాలు మరియు ఖాతాలను డిజిటల్‌గా నిర్వహించే Member Based Registry వేదిక.",
  orgName: "MBR APP",
  orgUrl: "https://mbr.mbrplatform.com",
  logoPath: "/favicon.png",
};

const VARADHI_BRANDING: AppBranding = {
  title: "Vaaradhi (వారధి) — Sell, Buy, Transport & Local Services",
  description:
    "వారధి అనేది స్థానిక కొనుగోళ్లు, అమ్మకాలు, రవాణా సౌకర్యాలు మరియు టెక్నీషియన్ సేవలను ఒకే చోట అందించే సమగ్ర వేదిక.",
  orgName: "Vaaradhi",
  orgUrl: "https://vaaradhi.mbrplatform.com",
  logoPath: "/varadhi-icon-512.png",
};

/** Branding for the current hostname; defaults to MBR on the main domain. */
export function appBrandingForHostname(hostname: string): AppBranding {
  return appForHostname(hostname) === "varadhi" ? VARADHI_BRANDING : MBR_BRANDING;
}