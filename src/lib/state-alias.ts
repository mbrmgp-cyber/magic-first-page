// Legacy Telugu state names → canonical English names used across Vaaradhi filters.
const TE_TO_EN: Record<string, string> = {
  "ఆంధ్రప్రదేశ్": "Andhra Pradesh",
  "ఆంధ్ర ప్రదేశ్": "Andhra Pradesh",
  "తెలంగాణ": "Telangana",
  "తెలంగాణా": "Telangana",
  "కర్ణాటక": "Karnataka",
  "తమిళనాడు": "Tamil Nadu",
  "కేరళ": "Kerala",
  "ఒడిశా": "Odisha",
  "మహారాష్ట్ర": "Maharashtra",
  "ఇతర": "",
};

export const enState = (value?: string | null): string => {
  if (!value) return "";
  const v = value.trim();
  return TE_TO_EN[v] ?? v;
};
