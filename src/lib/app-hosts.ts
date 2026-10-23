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