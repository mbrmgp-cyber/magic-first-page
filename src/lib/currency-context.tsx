import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
const RATE_KEY = "mbr_display_fx_rate"; // cached INR -> display rate

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && CURRENCIES.some((c) => c.code === stored)) setCurrencyState(stored);
    const cachedRate = Number(window.localStorage.getItem(RATE_KEY) || "");
    if (cachedRate > 0) setRateFromInr(cachedRate);
  }, []);

  // Fetch INR → display currency rate whenever currency changes.
  useEffect(() => {
    if (currency === "INR") { setRateFromInr(1); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/INR");
        const j = await r.json();
        const rate = j?.rates?.[currency];
        if (!cancel && typeof rate === "number" && rate > 0) {
          setRateFromInr(rate);
          if (typeof window !== "undefined")
            window.localStorage.setItem(RATE_KEY, String(rate));
        }
      } catch { /* keep cached */ }
    })();
    return () => { cancel = true; };
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
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
