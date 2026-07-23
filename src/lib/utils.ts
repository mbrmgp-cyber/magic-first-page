import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Society member-code prefix (e.g. Chitvel Helpline Society = "A/").
// Keeps a fixed leading prefix in ID inputs so users only type digits.
export const MEMBER_ID_PREFIX = "A/";

export function ensureMemberIdPrefix(v: string, prefix: string = MEMBER_ID_PREFIX): string {
  const up = (v ?? "").toUpperCase();
  const digits = up.replace(/^[A-Z]?\/?/, "").replace(/[^0-9]/g, "");
  return prefix + digits;
}
