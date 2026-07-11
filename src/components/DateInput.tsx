import * as React from "react";
import { Input } from "@/components/ui/input";

// Text-based date input. Accepts/emits ISO YYYY-MM-DD via `value` and `onChange`
// (compatible with existing <Input type="date"> callers using e.target.value),
// but displays and edits DD/MM/YYYY as plain text (no calendar picker).

function isoToDmy(iso?: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // Fallback: try Date parse
  const d = new Date(iso);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return "";
}

function dmyToIso(dmy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if (!m) return "";
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 3000) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits;
  if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return out;
}

type Props = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value?: string | null;
  onChange?: (e: { target: { value: string } }) => void;
};

export const DateInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onBlur, placeholder, inputMode, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(isoToDmy(value ?? ""));

    // Sync when external value changes and doesn't match the current text
    React.useEffect(() => {
      const iso = dmyToIso(text);
      if ((value ?? "") !== iso) setText(isoToDmy(value ?? ""));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode={inputMode ?? "numeric"}
        placeholder={placeholder ?? "DD/MM/YYYY"}
        value={text}
        maxLength={10}
        onChange={(e) => {
          const formatted = autoFormat(e.target.value);
          setText(formatted);
          const iso = dmyToIso(formatted);
          // Emit only when valid (or when cleared) so downstream state stays clean
          if (formatted === "") onChange?.({ target: { value: "" } });
          else if (iso) onChange?.({ target: { value: iso } });
        }}
        onBlur={(e) => {
          // Normalize on blur; if invalid, revert to last valid ISO representation
          const iso = dmyToIso(text);
          if (!iso && text !== "") setText(isoToDmy(value ?? ""));
          onBlur?.(e);
        }}
      />
    );
  },
);
DateInput.displayName = "DateInput";

// Utility for consistent DD/MM/YYYY display across the app
export function formatDMY(input?: string | number | Date | null): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
