import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Gavel, Activity, Users, CheckCircle2, XCircle, MapPin, Link as LinkIcon, FileText, Eye } from "lucide-react";
import { useI18n, bi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/member/events")({
  head: () => ({ meta: [{ title: "Events & Decisions — Member View" }] }),
  component: MemberEventsPage,
});

type Tab = "meetings" | "resolutions" | "activities";

function MemberEventsPage() {
  const { lang } = useI18n();
  const b = (te: string, en: string) => bi(te, en, lang);
  const [tab, setTab] = useState<Tab>("meetings");
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: own } = await supabase.from("organizations").select("id").eq("admin_user_id", user.id).maybeSingle();
      if (own?.id) { setOrgId(own.id); return; }
      const { data: m } = await supabase.from("members").select("org_id").eq("user_id", user.id).eq("status", "approved").maybeSingle();
      if (m?.org_id) setOrgId(m.org_id);
    })();
  }, []);

  const membersQ = useQuery({
    enabled: !!orgId,
    queryKey: ["mv-org-members", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, name, member_code").eq("org_id", orgId!).eq("status", "approved").order("name");
      return data ?? [];
    },
  });
  const meetingsQ = useQuery({
    enabled: !!orgId,
    queryKey: ["mv-org-meetings", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_meetings").select("*").eq("org_id", orgId!).order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });
  const resolutionsQ = useQuery({
    enabled: !!orgId,
    queryKey: ["mv-org-resolutions", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_resolutions").select("*").eq("org_id", orgId!).order("decision_date", { ascending: false });
      return data ?? [];
    },
  });
  const activitiesQ = useQuery({
    enabled: !!orgId,
    queryKey: ["mv-org-activities", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_activities").select("*").eq("org_id", orgId!).order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; member_code: string | null }>();
    (membersQ.data ?? []).forEach((m: any) => map.set(m.id, { name: m.name, member_code: m.member_code }));
    return map;
  }, [membersQ.data]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Link to="/member/dashboard" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> డాష్‌బోర్డ్ / Dashboard
          </Link>
        </div>

        <Card className="mbr-theme-big-box border p-4 mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">కార్యక్రమాలు & నిర్ణయాలు</h1>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold">
              <Eye className="w-3 h-3" /> View Only
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Events, Meetings & Decisions — Member View</p>
        </Card>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { k: "meetings", icon: Calendar, te: "సమావేశాలు", en: "Meetings" },
            { k: "resolutions", icon: Gavel, te: "నిర్ణయాలు", en: "Resolutions" },
            { k: "activities", icon: Activity, te: "కార్యక్రమాలు", en: "Activities" },
          ] as const).map((t) => {
            const Ic = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                aria-pressed={active}
                className={`mbr-theme-mini-box relative flex flex-col items-center gap-1 rounded-lg p-2 border text-xs transition ${active ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/50 border-b-4 border-b-primary-foreground/80" : "bg-card border-border text-foreground hover:border-primary"}`}
              >
                <Ic className="w-4 h-4" />
                <span className="font-semibold leading-tight">{t.te}</span>
                <span className="text-[10px] opacity-70">{t.en}</span>
              </button>
            );
          })}
        </div>

        {!orgId ? (
          <p className="text-muted-foreground text-sm">లోడ్ అవుతోంది…</p>
        ) : (
          <>
            {tab === "meetings" && <MeetingsView meetings={meetingsQ.data ?? []} resolutions={resolutionsQ.data ?? []} memberMap={memberMap} />}
            {tab === "resolutions" && <ResolutionsView resolutions={resolutionsQ.data ?? []} meetings={meetingsQ.data ?? []} memberMap={memberMap} />}
            {tab === "activities" && <ActivitiesView activities={activitiesQ.data ?? []} />}
          </>
        )}
      </div>
    </div>
  );
}

function NameChip({ id, memberMap, tone }: { id: string; memberMap: Map<string, { name: string; member_code: string | null }>; tone: "approve" | "oppose" | "neutral" }) {
  const info = memberMap.get(id);
  const label = info?.name ?? "Unknown";
  const code = info?.member_code ?? "";
  const cls =
    tone === "approve"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
      : tone === "oppose"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40"
        : "bg-card text-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>
      <span className="font-medium truncate max-w-[140px]">{label}</span>
      {code && <span className="opacity-70 text-[10px]">{code}</span>}
    </span>
  );
}

function NameList({ ids, memberMap, tone, emptyLabel }: { ids: string[]; memberMap: Map<string, any>; tone: "approve" | "oppose" | "neutral"; emptyLabel: string }) {
  if (!ids || ids.length === 0) return <p className="text-[11px] text-muted-foreground italic">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => <NameChip key={id} id={id} memberMap={memberMap} tone={tone} />)}
    </div>
  );
}

/* ============ Meetings (View-Only) ============ */
function MeetingsView({ meetings, resolutions, memberMap }: any) {
  const now = Date.now();
  const upcoming = meetings.filter((m: any) => new Date(m.scheduled_at).getTime() >= now);
  const past = meetings.filter((m: any) => new Date(m.scheduled_at).getTime() < now);

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-foreground font-semibold text-sm mb-2">రాబోయే సమావేశాలు / Upcoming ({upcoming.length})</h3>
          <div className="space-y-2">
            {upcoming.map((m: any) => <MeetingViewCard key={m.id} m={m} linkedRes={resolutions.filter((r: any) => r.meeting_id === m.id)} memberMap={memberMap} />)}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-muted-foreground font-semibold text-sm mb-2">గత సమావేశాలు / Past ({past.length})</h3>
        {past.length === 0
          ? <p className="text-muted-foreground text-xs">ఇంకా రికార్డ్ లేదు. / No records yet.</p>
          : <div className="space-y-2">{past.map((m: any) => <MeetingViewCard key={m.id} m={m} linkedRes={resolutions.filter((r: any) => r.meeting_id === m.id)} memberMap={memberMap} />)}</div>}
      </section>
    </div>
  );
}

function MeetingViewCard({ m, linkedRes, memberMap }: any) {
  const attended: string[] = m.attended_member_ids ?? [];
  const absent: string[] = m.absent_member_ids ?? [];
  return (
    <Card className="mbr-theme-mini-box bg-card border-border p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">
          {m.meeting_type === "online" ? "ఆన్‌లైన్ / Online" : "ఆఫ్‌లైన్ / Offline"}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">{m.status}</span>
      </div>
      <h4 className="text-foreground font-semibold mt-1 text-sm">{m.title}</h4>
      <p className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
      {m.location && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</p>}
      {m.meeting_link && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> <a href={m.meeting_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{m.meeting_link}</a></p>}
      {m.agenda && (
        <div className="mt-2 rounded border border-border bg-background/40 p-2">
          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> అజెండా / Agenda</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{m.agenda}</p>
        </div>
      )}

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
            <Users className="w-3 h-3" /> హాజరు / Attended ({attended.length})
          </p>
          <NameList ids={attended} memberMap={memberMap} tone="approve" emptyLabel="ఎవరూ లేరు / None recorded" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
            <XCircle className="w-3 h-3" /> గైర్హాజరు / Absent ({absent.length})
          </p>
          <NameList ids={absent} memberMap={memberMap} tone="oppose" emptyLabel="ఎవరూ లేరు / None recorded" />
        </div>
      </div>

      {m.notes && (
        <div className="mt-3 rounded border border-border bg-background/40 p-2">
          <p className="text-[11px] font-semibold text-foreground">అదనపు గమనికలు / Notes</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{m.notes}</p>
        </div>
      )}

      {linkedRes.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-foreground mb-1">సంబంధిత నిర్ణయాలు / Linked Resolutions ({linkedRes.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {linkedRes.map((r: any) => (
              <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
                {r.resolution_no} · {r.topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ============ Resolutions (View-Only) ============ */
function ResolutionsView({ resolutions, meetings, memberMap }: any) {
  if (resolutions.length === 0) return <p className="text-muted-foreground text-xs">ఇంకా నిర్ణయాలు లేవు. / No resolutions yet.</p>;
  return (
    <div className="space-y-3">
      {resolutions.map((r: any) => {
        const linkedMeeting = meetings.find((m: any) => m.id === r.meeting_id);
        const approved: string[] = r.approved_member_ids ?? [];
        const opposed: string[] = r.opposed_member_ids ?? [];
        return (
          <Card key={r.id} className="mbr-theme-mini-box bg-card border-border p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">{r.resolution_no}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">
                {r.status === "passed" ? "ఆమోదించబడింది / Passed" : r.status === "rejected" ? "తిరస్కరించబడింది / Rejected" : "పెండింగ్ / Pending"}
              </span>
            </div>
            <h4 className="text-foreground font-semibold mt-1 text-sm">{r.topic}</h4>
            <p className="text-[11px] text-muted-foreground">{new Date(r.decision_date).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
            {linkedMeeting && <p className="text-[11px] text-muted-foreground">సమావేశం / Meeting: <span className="text-foreground">{linkedMeeting.title}</span></p>}
            {r.description && (
              <div className="mt-2 rounded border border-border bg-background/40 p-2">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.description}</p>
              </div>
            )}

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> ఆమోదం / Approved ({approved.length})
                </p>
                <NameList ids={approved} memberMap={memberMap} tone="approve" emptyLabel="ఎవరూ లేరు / None" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  <XCircle className="w-3 h-3 text-rose-500" /> వ్యతిరేకం / Disapproved ({opposed.length})
                </p>
                <NameList ids={opposed} memberMap={memberMap} tone="oppose" emptyLabel="ఎవరూ లేరు / None" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ============ Activities (View-Only) ============ */
function ActivitiesView({ activities }: any) {
  if (activities.length === 0) return <p className="text-muted-foreground text-xs">ఇంకా కార్యక్రమాలు లేవు. / No activities yet.</p>;
  return (
    <div className="space-y-3">
      {activities.map((a: any) => {
        const budget = Number(a.allocated_budget) || 0;
        const expense = Number(a.actual_expense) || 0;
        const balance = budget - expense;
        return (
          <Card key={a.id} className="mbr-theme-mini-box bg-card border-border p-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">{a.status}</span>
            </div>
            <h4 className="text-foreground font-semibold mt-1 text-sm">{a.event_name}</h4>
            <p className="text-[11px] text-muted-foreground">{new Date(a.event_date).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
            {a.description && (
              <div className="mt-2 rounded border border-border bg-background/40 p-2">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.description}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
              <div className="rounded border border-border bg-background/40 p-2 text-center">
                <div className="text-muted-foreground">బడ్జెట్ / Budget</div>
                <div className="text-foreground font-bold text-sm mt-0.5">₹{budget.toLocaleString("en-IN")}</div>
              </div>
              <div className="rounded border border-border bg-background/40 p-2 text-center">
                <div className="text-muted-foreground">ఖర్చు / Expense</div>
                <div className="text-foreground font-bold text-sm mt-0.5">₹{expense.toLocaleString("en-IN")}</div>
              </div>
              <div className="rounded border border-border bg-background/40 p-2 text-center">
                <div className="text-muted-foreground">మిగులు / Balance</div>
                <div className={`font-bold text-sm mt-0.5 ${balance < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>₹{balance.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
