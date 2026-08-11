export type PartnerLevel = "mandal" | "district" | "state";

export const PARTNER_DEFAULT_PCT: Record<PartnerLevel, number> = {
  mandal: 25,
  district: 15,
  state: 10,
};

export const PARTNER_LEVEL_LABEL: Record<PartnerLevel, { te: string; en: string }> = {
  mandal: { te: "మండల ఇన్‌ఛార్జ్", en: "Mandal In-charge" },
  district: { te: "జిల్లా ఇన్‌ఛార్జ్", en: "District In-charge" },
  state: { te: "రాష్ట్ర ఇన్‌ఛార్జ్", en: "State In-charge" },
};
