// Browser-safe helpers for Vaaradhi blood donation posts.
// The donor / wanted choice is kept in the listing's existing `unit` field
// (free posts have no price), so no data schema change is needed.

export const BLOOD_DONOR = "రక్తదాత";
export const BLOOD_WANTED = "రక్తం కావాలి";
export const BLOOD_NEEDS = [BLOOD_DONOR, BLOOD_WANTED] as const;
export type BloodNeed = (typeof BLOOD_NEEDS)[number];

export function isBloodNeed(value: string | null | undefined): value is BloodNeed {
  return !!value && (BLOOD_NEEDS as readonly string[]).includes(value);
}

/** Saved blood posts without a choice are treated as donor posts. */
export function bloodNeedOf(unit: string | null | undefined): BloodNeed {
  return isBloodNeed(unit) ? unit : BLOOD_DONOR;
}

export function bloodDetailPlaceholder(need: BloodNeed): string {
  return need === BLOOD_WANTED
    ? "ఎవరికి, ఏ ఆసుపత్రిలో, ఎన్ని యూనిట్లు, ఎప్పటికి అవసరం"
    : "చివరిసారి రక్తదానం చేసిన తేదీ / ఎన్నిసార్లు చేశారు";
}
