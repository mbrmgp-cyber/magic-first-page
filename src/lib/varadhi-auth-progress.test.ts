import { describe, expect, it } from "vitest";
import { clearVaradhiAuthProgress, readVaradhiAuthProgress, saveVaradhiAuthProgress, VARADHI_AUTH_PROGRESS_KEY } from "./varadhi-auth-progress";

function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
}
describe("Vaaradhi pending registration", () => {
  it("restores email and OTP entry when the same browser opens a new tab", () => {
    const browser = storage();
    saveVaradhiAuthProgress(browser, { email: " Person@Example.com ", step: "otp", otpLength: 8 }, 1000);
    expect(readVaradhiAuthProgress(browser, 2000)).toEqual({ email: "person@example.com", step: "otp", otpLength: 8, savedAt: 1000 });
  });
  it("retains the password setup stage after verification", () => {
    const browser = storage();
    saveVaradhiAuthProgress(browser, { email: "person@example.com", step: "password", otpLength: 6 }, 1000);
    expect(readVaradhiAuthProgress(browser, 2000)?.step).toBe("password");
  });
  it("never stores supplied passwords or codes", () => {
    const browser = storage();
    const progress = { email: "person@example.com", step: "otp" as const, otpLength: 6, password: "test-only-password", otp: "123456" };
    saveVaradhiAuthProgress(browser, progress, 1000);
    expect(Object.keys(JSON.parse(browser.getItem(VARADHI_AUTH_PROGRESS_KEY) ?? "{}"))).toEqual(["email", "step", "otpLength", "savedAt"]);
  });
  it("clears completed or explicitly abandoned registration", () => {
    const browser = storage();
    saveVaradhiAuthProgress(browser, { email: "person@example.com", step: "otp", otpLength: 6 }, 1000);
    clearVaradhiAuthProgress(browser);
    expect(readVaradhiAuthProgress(browser, 2000)).toBeNull();
  });
  it("discards malformed and stale progress without claiming verification", () => {
    const browser = storage();
    browser.setItem(VARADHI_AUTH_PROGRESS_KEY, "broken");
    expect(readVaradhiAuthProgress(browser, 2000)).toBeNull();
    saveVaradhiAuthProgress(browser, { email: "person@example.com", step: "otp", otpLength: 6 }, 1000);
    expect(readVaradhiAuthProgress(browser, 1000 + 30 * 60 * 1000)).toBeNull();
  });
});