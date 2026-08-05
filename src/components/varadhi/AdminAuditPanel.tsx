import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAdminAudit } from "@/lib/varadhi.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock } from "lucide-react";

const ACTION_TE: Record<string, string> = {
  request_approved: "దరఖాస్తు ఆమోదం",
  request_rejected: "దరఖాస్తు తిరస్కరణ",
  district_admin_assigned: "జిల్లా అడ్మిన్ కేటాయింపు",
  mandal_admin_assigned: "మండల అడ్మిన్ కేటాయింపు",
  seat_reassigned: "పాత్ర/ప్రాంతం మార్పు",
  seat_created: "కొత్త అడ్మిన్ సీటు",
  seat_activated: "యాక్టివ్ చేయబడింది",
  seat_deactivated: "నిలిపివేయబడింది",
};

const LEVEL_TE: Record<string, string> = {
  state_admin: "రాష్ట్ర అడ్మిన్",
  district_admin: "జిల్లా అడ్మిన్",
  mandal_admin: "మండల అడ్మిన్",
};

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("te-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const levelOf = (o: any) => (o?.granted_level ?? o?.level) as string | undefined;

function Diff({ before, after }: { before: any; after: any }) {
  const b = levelOf(before);
  const a = levelOf(after);
  const areaOf = (o: any) => [o?.mandal, o?.district, o?.state].filter(Boolean).join(" / ");
  const ba = areaOf(before);
  const aa = areaOf(after);
  const bits: string[] = [];
  if (a && b && a !== b) bits.push(`${LEVEL_TE[b] ?? b} → ${LEVEL_TE[a] ?? a}`);
  else if (a && !b) bits.push(LEVEL_TE[a] ?? a);
  if (ba && aa && ba !== aa) bits.push(`${ba} → ${aa}`);
  if (typeof after?.is_active === "boolean" && typeof before?.is_active === "boolean"
      && after.is_active !== before.is_active) {
    bits.push(after.is_active ? "యాక్టివ్" : "ఇన్‌యాక్టివ్");
  }
  if (!bits.length) return null;
  return <p className="text-[11px] text-[#1e3a8a]">{bits.join(" · ")}</p>;
}

export function AdminAuditPanel() {
  const listAudit = useServerFn(adminListAdminAudit);
  const q = useQuery({
    queryKey: ["varadhi-admin-audit"],
    queryFn: () => listAudit({ data: { limit: 150 } }),
  });

  const entries = (q.data?.entries ?? []) as any[];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-[#1e3a8a]" />
        <h2 className="text-sm font-semibold text-[#1e3a8a]">అడ్మిన్ మార్పుల చరిత్ర</h2>
      </div>

      {q.isLoading ? (
        <p className="text-center text-sm py-8">లోడ్…</p>
      ) : q.error ? (
        <Card className="p-6 text-center text-sm text-destructive">
          చరిత్ర చూడటానికి అనుమతి లేదు.
        </Card>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          ఇంకా ఏ మార్పులూ నమోదు కాలేదు.
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {ACTION_TE[e.action] ?? e.action}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" /> {fmt(e.created_at)}
                </span>
              </div>

              <p className="text-sm font-medium">
                {e.target_name ?? "సభ్యుడు"}
                {[e.mandal, e.district, e.state].filter(Boolean).length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {" · "}{[e.mandal, e.district, e.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </p>

              <Diff before={e.before_data} after={e.after_data} />

              {e.notes && <p className="text-[11px] text-muted-foreground">గమనిక: {e.notes}</p>}

              <p className="text-[11px] text-muted-foreground">
                మార్పు చేసినవారు: {e.actor_name ?? "అడ్మిన్"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
