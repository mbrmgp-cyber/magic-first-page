// Mandal / Tehsil lookup helpers built on the generated dataset.
import { INDIA_MANDALS } from "./india-mandals-data";

const norm = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// Telugu → English aliases for states used in the Vaaradhi UI.
const STATE_ALIASES: Record<string, string> = {
  "ఆంధ్రప్రదేశ్": "Andhra Pradesh",
  "తెలంగాణ": "Telangana",
  "కర్ణాటక": "Karnataka",
  "తమిళనాడు": "Tamil Nadu",
};

const findKey = (obj: Record<string, unknown>, name: string): string | undefined => {
  if (!name) return undefined;
  if (name in obj) return name;
  const n = norm(name);
  const keys = Object.keys(obj);
  return (
    keys.find((k) => norm(k) === n) ??
    keys.find((k) => norm(k).startsWith(n) || n.startsWith(norm(k)))
  );
};

export const resolveStateKey = (state: string): string | undefined => {
  const alias = STATE_ALIASES[state] ?? state;
  return findKey(INDIA_MANDALS, alias);
};

/** All mandals/tehsils of a state (used as fallback for newly-formed districts). */
export const mandalsForState = (state: string): string[] => {
  const key = resolveStateKey(state);
  if (!key) return [];
  return Array.from(new Set(Object.values(INDIA_MANDALS[key]).flat())).sort();
};

/**
 * Mandals for a state + district. Falls back to the whole state's mandals when
 * the district is a newly created one that isn't in the base dataset.
 */
export const indiaMandalsFor = (state: string, district: string): string[] => {
  const stateKey = resolveStateKey(state);
  if (!stateKey) return [];
  const districts = INDIA_MANDALS[stateKey];
  if (!district) return mandalsForState(state);
  const dKey = findKey(districts, district);
  if (dKey) return districts[dKey];
  return mandalsForState(state);
};

export { INDIA_MANDALS };
