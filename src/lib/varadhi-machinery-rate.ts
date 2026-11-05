import { formatAmount } from "./varadhi-format";

export const MACHINERY_RATE_UNITS = ["km", "hour", "day"] as const;
export type MachineryRateUnit = typeof MACHINERY_RATE_UNITS[number];

const labels = {
  te: { km: "కిలోమీటరుకు", hour: "గంటకు", day: "రోజుకు", price: "ధర", extra: "ఇతర వివరాలు / అదనపు ఛార్జీలు", contact: "ధర సంప్రదించండి" },
  en: { km: "Per kilometre", hour: "Per hour", day: "Per day", price: "Price", extra: "Extra details / additional charges", contact: "Contact for price" },
  hi: { km: "प्रति किलोमीटर", hour: "प्रति घंटा", day: "प्रति दिन", price: "कीमत", extra: "अन्य विवरण / अतिरिक्त शुल्क", contact: "कीमत के लिए संपर्क करें" },
};

export function machineryRateLabels(lang: string = "te") {
  return labels[lang === "en" || lang === "hi" ? lang : "te"];
}

// Keep a versioned prefix in the existing description field; legacy posts
// without a prefix retain their original per-kilometre interpretation.
export function readMachineryRate(description?: string | null): { unit: MachineryRateUnit; notes: string } {
  const text = description ?? "";
  const match = /^\[\[vaaradhi-rate-v1:(km|hour|day)\]\](?:\r?\n|$)/.exec(text);
  if (!match) return { unit: "km", notes: text };
  const unit = MACHINERY_RATE_UNITS.find((value) => value === match[1]) ?? "km";
  return { unit, notes: text.slice(match[0].length) };
}

export function writeMachineryRate(unit: MachineryRateUnit, notes: string): string {
  return `[[vaaradhi-rate-v1:${unit}]]\n${notes.trim()}`;
}

export function formatMachineryRate(amount: number | string | null | undefined, description?: string | null, lang: string = "te") {
  const copy = machineryRateLabels(lang);
  const value = formatAmount(amount);
  return value ? `${copy.price}: Rs. ${value} / ${copy[readMachineryRate(description).unit]}` : copy.contact;
}

export function searchAddress(address: { village?: string | null; city?: string | null; mandal?: string | null; district?: string | null; state?: string | null }) {
  return [address.village || address.city, address.mandal, address.district, address.state]
    .map((value) => value?.trim()).filter(Boolean).join(", ");
}