export const COMMITTEE_ROLES = [
  "president", "vice_president", "advisor", "treasurer", "executive", "worker",
  "founder", "disciplinary_committee_member",
] as const;

export type CommitteeRole = (typeof COMMITTEE_ROLES)[number];

export const COMMITTEE_ROLE_LABELS: Record<CommitteeRole, { en: string; te: string }> = {
  president: { en: "President", te: "అధ్యక్షుడు" },
  vice_president: { en: "Vice President", te: "ఉపాధ్యక్షుడు" },
  advisor: { en: "Advisor", te: "గౌరవ సలహాదారు" },
  treasurer: { en: "Treasurer", te: "కోశాధికారి" },
  executive: { en: "Executive", te: "కార్యనిర్వాహకుడు" },
  worker: { en: "Worker", te: "కార్యకర్త" },
  founder: { en: "Founders", te: "వ్యవస్థాపకులు" },
  disciplinary_committee_member: { en: "Disciplinary Committee Member", te: "క్రమశిక్షణ కమిటీ మెంబర్" },
};

/** Display name of a committee position; unknown legacy values are shown as stored. */
export function committeeRoleLabel(value: unknown, lang: "en" | "te"): string {
  const role = COMMITTEE_ROLES.find((candidate) => candidate === value);
  if (!role) return typeof value === "string" ? value : "";
  return COMMITTEE_ROLE_LABELS[role][lang];
}

export function parseCommitteeRole(value: unknown): CommitteeRole {
  const role = COMMITTEE_ROLES.find((candidate) => candidate === value);
  if (!role) throw new Error("Invalid executive committee position");
  return role;
}