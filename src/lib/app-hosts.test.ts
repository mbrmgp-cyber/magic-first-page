import { expect, it } from "vitest";
import { appEntryPath, appForHostname, appPageUrl } from "./app-hosts";

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