import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordUpdateErrorMessage } from "./password-errors";

describe("passwordUpdateErrorMessage", () => {
  it("explains passwords rejected as weak/leaked", () => {
    expect(
      passwordUpdateErrorMessage({ message: "Password is known to be weak and easy to guess, please choose a different one." }),
    ).toMatch(/too common/);
  });
  it("explains an expired verification session", () => {
    expect(passwordUpdateErrorMessage({ message: "Auth session missing!" })).toMatch(/expired/);
  });
  it("falls back to the generic message", () => {
    expect(passwordUpdateErrorMessage({ message: "boom" })).toBe("Password update failed");
  });
  it("requires eight characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});
