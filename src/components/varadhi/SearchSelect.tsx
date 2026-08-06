import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
};

/** Dropdown with a built-in type-to-filter search bar. */
export function SearchSelect({ value, onChange, options, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const n = term.trim().toLowerCase();
    return n ? options.filter((o) => o.toLowerCase().includes(n)) : options;
  }, [options, term]);

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setTerm(""); }}
        className="flex w-full items-center gap-1 rounded-xl border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[#1e3a8a] disabled:opacity-50"
      >
        <span className={`min-w-0 flex-1 truncate text-left ${value ? "" : "text-[#1e3a8a]/50"}`}>
          {value || placeholder}
        </span>
        {value ? (
          <X
            className="h-3 w-3 shrink-0 text-[#1e3a8a]/50"
            onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
          />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-[#1e3a8a]/50" />
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-[calc(100%+3rem)] max-w-[80vw] overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center gap-1 border-b border-black/5 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#1e3a8a]/40" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-[#1e3a8a] outline-none placeholder:text-[#1e3a8a]/40"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-[#1e3a8a]/50">ఏమీ దొరకలేదు</p>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className={`block w-full px-3 py-1.5 text-left text-[11px] ${
                  o === value ? "bg-[#1e3a8a]/10 font-semibold text-[#1e3a8a]" : "text-[#1e3a8a]/80"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
