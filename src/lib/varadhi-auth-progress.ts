import { z } from "zod";

export const VARADHI_AUTH_PROGRESS_KEY = "vaaradhi-pending-registration-v1";
const MAX_AGE = 30 * 60 * 1000;
const progressSchema = z.object({
  email: z.string().email(),
  step: z.enum(["otp", "password"]),
  otpLength: z.number().int().min(6).max(10),
  savedAt: z.number().finite(),
});
export type VaradhiAuthProgress = z.infer<typeof progressSchema>;
type ProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveVaradhiAuthProgress(storage: ProgressStorage, progress: Omit<VaradhiAuthProgress, "savedAt">, now = Date.now()) {
  // Explicit allowlist: never store a code, password, or authentication token.
  const parsed = progressSchema.parse({ email: progress.email.trim().toLowerCase(), step: progress.step, otpLength: progress.otpLength, savedAt: now });
  try { storage.setItem(VARADHI_AUTH_PROGRESS_KEY, JSON.stringify(parsed)); } catch { /* storage may be unavailable */ }
}

export function clearVaradhiAuthProgress(storage: ProgressStorage) {
  try { storage.removeItem(VARADHI_AUTH_PROGRESS_KEY); } catch { /* storage may be unavailable */ }
}

export function readVaradhiAuthProgress(storage: ProgressStorage, now = Date.now()): VaradhiAuthProgress | null {
  try {
    const parsed = progressSchema.safeParse(JSON.parse(storage.getItem(VARADHI_AUTH_PROGRESS_KEY) ?? "null"));
    if (parsed.success && parsed.data.savedAt <= now && now - parsed.data.savedAt < MAX_AGE) return parsed.data;
    clearVaradhiAuthProgress(storage);
  } catch { clearVaradhiAuthProgress(storage); }
  return null;
}