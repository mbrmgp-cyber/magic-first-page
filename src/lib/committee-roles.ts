export const COMMITTEE_ROLES = [
  "president", "vice_president", "advisor", "treasurer", "executive", "worker",
  "founder", "disciplinary_committee_member",
] as const;

export type CommitteeRole = (typeof COMMITTEE_ROLES)[number];

export function parseCommitteeRole(value: unknown): CommitteeRole {
  const role = COMMITTEE_ROLES.find((candidate) => candidate === value);
  if (!role) throw new Error("Invalid executive committee position");
  return role;
}