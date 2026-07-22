import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getOrgCurrencyPreference, setOrgCurrencyPreference } from "@/lib/currency.functions";

export type CurrencyCode = "INR" | "USD" | "AED" | "KWD" | "MYR";

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
];

export const BASE_CURRENCY: CurrencyCode = "INR";

const STORAGE_KEY = "mbr_display_currency";
const RATE_KEY_PREFIX = "mbr_display_fx_rate_"; // cached INR -> display rate per currency

const rateKey = (currency: CurrencyCode) => `${RATE_KEY_PREFIX}${currency}`;

type Ctx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  /** Rate: 1 INR = rate * <display currency>. Always 1 for INR. */
  rateFromInr: number;
  /** Convert an INR-base amount into the currently-selected display currency. */
  convert: (inrAmount: number | string | null | undefined) => number;
  /** Format a raw number in current currency (no conversion). */
  fmt: (n: number | string | null | undefined, opts?: { withSymbol?: boolean }) => string;
  /** Convert an INR base amount → display currency and format. */
  fmtBase: (inrAmount: number | string | null | undefined, opts?: { withSymbol?: boolean }) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);
  const [rateFromInr, setRateFromInr] = useState<number>(1);
  const loadPreference = useServerFn(getOrgCurrencyPreference);
  const savePreference = useServerFn(setOrgCurrencyPreference);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && CURRENCIES.some((c) => c.code === stored)) {
      setCurrencyState(stored);
      const cachedRate = Number(window.localStorage.getItem(rateKey(stored)) || "");
      setRateFromInr(stored === "INR" ? 1 : cachedRate > 0 ? cachedRate : 1);
    }

    let cancel = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const pref = await loadPreference();
        const storedCode = stored && CURRENCIES.some((c) => c.code === stored) ? stored : null;
        if (!pref.hasPreference && storedCode) {
          savePreference({ data: { currency: storedCode } }).catch(() => {});
          return;
        }
        const code = pref.currency as CurrencyCode;
        if (!cancel && pref.hasPreference && CURRENCIES.some((c) => c.code === code)) {
          setCurrencyState(code);
          window.localStorage.setItem(STORAGE_KEY, code);
          const cachedRate = Number(window.localStorage.getItem(rateKey(code)) || "");
          setRateFromInr(code === "INR" ? 1 : cachedRate > 0 ? cachedRate : 1);
        }
      } catch { /* signed out or preference not available */ }
    })();
    return () => { cancel = true; };
  }, []);

  // Fetch INR → display currency rate whenever currency changes.
  useEffect(() => {
    if (currency === "INR") { setRateFromInr(1); return; }
    if (typeof window !== "undefined") {
      const cachedRate = Number(window.localStorage.getItem(rateKey(currency)) || "");
      setRateFromInr(cachedRate > 0 ? cachedRate : 1);
    }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/INR");
        const j = await r.json();
        const rate = j?.rates?.[currency];
        if (!cancel && typeof rate === "number" && rate > 0) {
          setRateFromInr(rate);
          if (typeof window !== "undefined")
            window.localStorage.setItem(rateKey(currency), String(rate));
        }
      } catch { /* keep cached */ }
    })();
    return () => { cancel = true; };
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
    savePreference({ data: { currency: c } }).catch(() => {});
  };

  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";

  const convert: Ctx["convert"] = (n) => {
    const num = Number(n ?? 0);
    if (currency === "INR") return num;
    return num * (rateFromInr > 0 ? rateFromInr : 1);
  };

  const formatNumber = (num: number) =>
    num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmt: Ctx["fmt"] = (n, opts) => {
    const text = formatNumber(Number(n ?? 0));
    return opts?.withSymbol === false ? text : `${symbol} ${text}`;
  };

  const fmtBase: Ctx["fmtBase"] = (n, opts) => {
    const text = formatNumber(convert(n));
    return opts?.withSymbol === false ? text : `${symbol} ${text}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol, rateFromInr, convert, fmt, fmtBase }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}

export function CurrencySelector({
  className = "",
  variant = "dark",
}: { className?: string; variant?: "dark" | "light" }) {
  const { currency, setCurrency } = useCurrency();
  const base =
    variant === "dark"
      ? "bg-zinc-900 border-white/10 text-white"
      : "bg-white border-gray-300 text-gray-900";
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className={`border rounded-md px-2 py-1.5 text-sm ${base} ${className}`}
      aria-label="Select display currency"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code} className="text-gray-900">
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
