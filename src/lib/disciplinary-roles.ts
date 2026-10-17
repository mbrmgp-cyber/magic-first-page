export const DISCIPLINARY_ROLES = ["founder", "sincere_senior", "present_president"] as const;
export type DisciplinaryRole = (typeof DISCIPLINARY_ROLES)[number];

export function parseDisciplinaryRole(value: unknown): DisciplinaryRole {
  const role = DISCIPLINARY_ROLES.find((candidate) => candidate === value);
  if (!role) throw new Error("Invalid disciplinary committee role");
  return role;
}

export const disciplinaryRoleCopy: Record<string, { en: string; te: string; hi: string }> = {
  founder: { en: "Founder", te: "వ్యవస్థాపకుడు", hi: "संस्थापक" },
  sincere_senior: { en: "Sincere Senior", te: "నిబద్ధతగల సీనియర్ సభ్యుడు", hi: "निष्ठावान वरिष्ठ सदस्य" },
  present_president: { en: "Present President", te: "ప్రస్తుత అధ్యక్షుడు", hi: "वर्तमान अध्यक्ष" },
  former_president: { en: "Former President", te: "మాజీ అధ్యక్షుడు", hi: "पूर्व अध्यक्ष" },
};