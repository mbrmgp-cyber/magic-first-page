import { useState } from "react";
import { ShieldCheck, ChevronDown, Check } from "lucide-react";
import { useSimRole, ROLE_LABELS, type SimRole } from "@/lib/rbac";

const ROLES: SimRole[] = ["super_admin", "chit_admin", "accounts_admin"];

export function RoleSwitcher() {
  const { role, setRole } = useSimRole();
  const [open, setOpen] = useState(false);

  const toneFor = (r: SimRole) =>
    r === "super_admin" ? "#ff8c28"
    : r === "chit_admin" ? "#fbbf24"
    : "#22c55e";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 rounded-lg border border-zinc-700 bg-zinc-950/95 backdrop-blur shadow-2xl p-1.5 w-56">
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
            Simulated Role · టెస్ట్ రోల్
          </div>
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <button
                key={r}
                onClick={() => { setRole(r); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-zinc-800 transition"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: toneFor(r) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium leading-tight">{ROLE_LABELS[r].en}</div>
                  <div className="text-[10px] text-zinc-400 leading-tight">{ROLE_LABELS[r].te}</div>
                </div>
                {active && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
          <div className="px-2 pt-1.5 pb-1 text-[9px] text-zinc-500 border-t border-zinc-800 mt-1">
            UI simulation only — for testing layouts.
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-2.5 pr-3 py-2 border border-zinc-700 bg-zinc-950/95 backdrop-blur text-white text-xs font-semibold shadow-xl hover:scale-105 transition"
        style={{ boxShadow: `0 0 18px ${toneFor(role)}55` }}
      >
        <ShieldCheck className="w-4 h-4" style={{ color: toneFor(role) }} />
        <span>{ROLE_LABELS[role].en}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
    </div>
  );
}
