import { expect, it } from "vitest";
import { appBrandingForHostname, appEntryPath, appForHostname, appPageUrl, appManifestPath, VARADHI_APP_URL } from "./app-hosts";

it("retains the old MBR APP logo on its own hostname", () => {
  expect(appBrandingForHostname("mbr.mbrplatform.com").logoPath).toBe("/mbr-icon-512-v2.png");
  expect(appBrandingForHostname("mbr.mbrplatform.com").orgName).toBe("MBR APP");
});
it("gives the main platform its selected separate logo", () => {
  expect(appBrandingForHostname("mbrplatform.com").logoPath).toBe("/platform-icon-512-v2.png");
  expect(appBrandingForHostname("mbrplatform.com").orgName).toBe("MBR Platform");
});
it("uses Vaaradhi icons only for Vaaradhi branding", () => {
  expect(appBrandingForHostname("vaaradhi.mbrplatform.com").logoPath).toBe("/varadhi-icon-512-v2.png");
  expect(appBrandingForHostname("vaaradhi.mbrplatform.com").orgName).toBe("Vaaradhi");
});

it("launches Vaaradhi links and the Android shell on its dedicated domain", () => {
  expect(VARADHI_APP_URL).toBe("https://vaaradhi.mbrplatform.com/varadhi");
  expect(appForHostname(new URL(VARADHI_APP_URL).hostname)).toBe("varadhi");
});
it("installs the platform with its own manifest rather than the MBR manifest", () => {
  expect(appManifestPath("mbrplatform.com")).toBe("/platform-manifest-v2.webmanifest");
});
it("retains direct MBR and Vaaradhi installation destinations", () => {
  expect(appManifestPath("mbr.mbrplatform.com")).toBe("/mbr-manifest-v2.webmanifest");
  expect(appManifestPath("vaaradhi.mbrplatform.com")).toBe("/varadhi-manifest-v2.webmanifest");
  expect(appManifestPath("localhost", "/varadhi/auth")).toBe("/varadhi-manifest-v2.webmanifest");
});

it("opens MBR APP on its approved hostname", () => {
  expect(appEntryPath("mbr.mbrplatform.com")).toBe("/mbr");
});
it("opens Vaaradhi on its approved hostname", () => {
  expect(appEntryPath("vaaradhi.mbrplatform.com")).toBe("/varadhi");
  expect(appForHostname("vaaradhi.mbrplatform.com")).toBe("varadhi");
});
it("keeps the main platform and previews unchanged", () => {
  expect(appEntryPath("mbrplatform.com")).toBeNull();
  expect(appEntryPath("localhost")).toBeNull();
});
it("keeps each app page canonical on its own approved hostname", () => {
  expect(appPageUrl("vaaradhi.mbrplatform.com", "/varadhi")).toBe("https://vaaradhi.mbrplatform.com/varadhi");
  expect(appPageUrl("mbr.mbrplatform.com", "/mbr")).toBe("https://mbr.mbrplatform.com/mbr");
  expect(appPageUrl("untrusted.example", "/mbr")).toBe("https://mbrplatform.com/mbr");
});