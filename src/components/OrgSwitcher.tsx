import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Building2, Check, ChevronDown } from "lucide-react";
import { listMyOrgs } from "@/lib/org.functions";
import { getActiveOrgId, setActiveOrgId } from "@/lib/active-org";

const ACCESS_LABEL: Record<string, { en: string; te: string }> = {
  owner: { en: "Admin", te: "అడ్మిన్" },
  committee: { en: "Committee", te: "కమిటీ" },
  member: { en: "Member", te: "సభ్యుడు" },
};

/** Lets one account move between the societies it belongs to. */
export function OrgSwitcher({ className = "" }: { className?: string }) {
  const fetchOrgs = useServerFn(listMyOrgs);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    setActive(getActiveOrgId());
  }, []);

  const q = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => fetchOrgs(),
    staleTime: 60_000,
  });

  const orgs = q.data?.orgs ?? [];
  if (orgs.length < 2) return null;

  const current = orgs.find((o: any) => o.id === active) ?? orgs[0];

  const pick = async (id: string) => {
    setActiveOrgId(id);
    setActive(id);
    setOpen(false);
    await qc.invalidateQueries();
    router.invalidate();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 max-w-[170px] rounded-md border border-zinc-700 bg-black/40 backdrop-blur px-2 h-9 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
        aria-label="Switch organization"
      >
        {current?.logo_url ? (
          <img src={current.logo_url} alt="" className="h-5 w-5 rounded object-contain bg-white" />
        ) : (
          <Building2 className="h-4 w-4 text-[#ff8c28]" />
        )}
        <span className="truncate">{current?.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-950/95 backdrop-blur shadow-2xl p-1.5">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
              సంస్థ మార్చండి · Switch organization
            </div>
            {orgs.map((o: any) => (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left hover:bg-zinc-800 transition"
              >
                {o.logo_url ? (
                  <img src={o.logo_url} alt="" className="h-6 w-6 rounded object-contain bg-white shrink-0" />
                ) : (
                  <Building2 className="h-5 w-5 text-[#ff8c28] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium leading-tight truncate">{o.name}</div>
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    {ACCESS_LABEL[o.access]?.te} · {ACCESS_LABEL[o.access]?.en}
                    {o.status !== "approved" ? " · pending" : ""}
                  </div>
                </div>
                {o.id === current?.id && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
