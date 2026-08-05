import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  amIVaradhiAdmin,
  adminListVaradhiProfiles,
  adminReviewVaradhiProfile,
  adminGetPointSettings,
  adminUpdatePointSettings,
  adminPointsOverview,
  adminUserPointHistory,
  getMyVaradhiScope,
} from "@/lib/varadhi.functions";
import { AdminRequestsPanel, AdminHierarchyPanel } from "@/components/varadhi/AdminHierarchyPanel";
import { AdminAuditPanel } from "@/components/varadhi/AdminAuditPanel";
import { AdminMessagesPanel } from "@/components/varadhi/AdminMessagesPanel";
import { ContactAdminForm } from "@/components/varadhi/ContactAdminForm";
import { STATES, districtsFor } from "@/lib/ap-locations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ExternalLink, ShieldCheck, Coins, Upload, Phone, MapPin, Menu, ChevronDown, History as HistoryIcon } from "lucide-react";



export const Route = createFileRoute("/varadhi/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vaaradhi Admin — Registrations & Approvals" },
      { name: "description", content: "Vaaradhi super admin panel to review and approve seller, buyer, transport and service registrations." },
      { property: "og:title", content: "Vaaradhi Admin — Registrations & Approvals" },
      { property: "og:description", content: "Vaaradhi super admin panel to review and approve registrations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VaradhiAdmin,
});

function VaradhiAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIVaradhiAdmin);
  const fetchProfiles = useServerFn(adminListVaradhiProfiles);
  const review = useServerFn(adminReviewVaradhiProfile);
  const getScope = useServerFn(getMyVaradhiScope);

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      setAuthed(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopeQ = useQuery({ queryKey: ["varadhi-my-scope"], queryFn: () => getScope(), enabled: authed === true });
  const adminQ = useQuery({ queryKey: ["varadhi-am-i-admin"], queryFn: () => checkAdmin(), enabled: authed === true });
  const isSuper = adminQ.data?.isAdmin ?? false;
  const scope = scopeQ.data;
  const isAdmin = isSuper || !!scope?.level;

  type AdminTab = "reg" | "points" | "requests" | "hierarchy" | "messages" | "audit";
  const [tab, setTab] = useState<AdminTab>("reg");
  const [menuOpen, setMenuOpen] = useState(false);

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["varadhi-admin-list", filter],
    queryFn: () => fetchProfiles({ data: { status: filter } }),
    enabled: isAdmin,
  });

  async function act(userId: string, action: "approve" | "reject") {
    setBusy(userId);
    try {
      await review({ data: { user_id: userId, action, notes: notes[userId] } });
      toast.success(action === "approve" ? "ఆమోదించబడింది" : "తిరస్కరించబడింది");
      qc.invalidateQueries({ queryKey: ["varadhi-admin-list"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setBusy(null);
    }
  }

  if (authed === null || adminQ.isLoading || scopeQ.isLoading) return <p className="p-8 text-center text-sm">లోడ్…</p>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 pb-24 space-y-3">
        <Card className="p-4 space-y-3 border-[#f97316]/40 bg-[#fff7ed]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#f97316]" />
            <h2 className="text-sm font-bold text-[#1e3a8a]">అడ్మిన్ దరఖాస్తు</h2>
          </div>
          <p className="text-xs text-[#1e3a8a]/80">
            రాష్ట్రం, జిల్లా లేదా మండలం స్థాయిలో వారధి అడ్మిన్ కావాలనుకునేవారు ఇక్కడ దరఖాస్తు చేసుకోవచ్చు.
            ఫోటో, ఆధార్, ప్రాంతం వివరాలు ఇచ్చి పంపండి — సూపర్ అడ్మిన్ పరిశీలించి ఆమోదిస్తారు.
          </p>
          <ul className="text-[11px] text-[#1e3a8a]/70 space-y-0.5">
            <li>• రాష్ట్ర అడ్మిన్ — మొత్తం రాష్ట్రానికి</li>
            <li>• జిల్లా అడ్మిన్ — ఒక జిల్లాకు</li>
            <li>• మండల అడ్మిన్ — ఒక మండలానికి</li>
          </ul>
          <Button className="w-full bg-[#f97316] hover:bg-[#ea6a06]" onClick={() => navigate({ to: "/varadhi/admin-apply" })}>
            దరఖాస్తు ఫారం తెరవండి
          </Button>
        </Card>
        <ContactAdminForm />
        <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/varadhi" })}>హోమ్‌కు వెళ్ళండి</Button>
      </div>
    );
  }



  const rows = listQ.data?.profiles ?? [];
  const filters: Array<{ k: typeof filter; label: string }> = [
    { k: "pending", label: "పెండింగ్" },
    { k: "approved", label: "ఆమోదం" },
    { k: "rejected", label: "తిరస్కరణ" },
    { k: "all", label: "అన్నీ" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[#1e3a8a]">వారధి అడ్మిన్ ప్యానెల్</h1>
        <Link to="/varadhi" className="text-xs underline text-[#1e3a8a]/70">హోమ్</Link>
      </header>

      {(() => {
        const items: Array<{ k: AdminTab; label: string }> = [
          { k: "reg", label: "రిజిస్ట్రేషన్లు" },
          ...(isSuper ? [{ k: "points" as const, label: "పాయింట్లు" }] : []),
          ...(isSuper || scope?.level === "state_admin"
            ? [{ k: "requests" as const, label: "అడ్మిన్ దరఖాస్తులు" }] : []),
          { k: "hierarchy", label: "అడ్మిన్ హైరార్కీ" },
          { k: "messages", label: "యూజర్ సందేశాలు" },
          { k: "audit", label: "మార్పుల చరిత్ర" },
        ];
        const current = items.find((i) => i.k === tab) ?? items[0]!;
        return (
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Menu className="h-4 w-4" /> {current.label}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </Button>
            {menuOpen && (
              <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                {items.map((i) => (
                  <button
                    key={i.k}
                    type="button"
                    onClick={() => { setTab(i.k); setMenuOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm ${
                      i.k === tab ? "bg-[#1e3a8a] text-white font-semibold" : "text-[#1e3a8a] hover:bg-[#1e3a8a]/5"
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {scope?.level && scope.level !== "super_admin" && (
        <p className="text-[11px] text-muted-foreground">
          మీ పరిధి: {scope.level === "state_admin" ? "రాష్ట్ర అడ్మిన్" : "జిల్లా అడ్మిన్"} · {[scope.state, scope.district].filter(Boolean).join(" / ")}
        </p>
      )}

      {tab === "points" && isSuper && <PointsPanel />}
      {tab === "requests" && <AdminRequestsPanel isSuper={isSuper} />}
      {tab === "hierarchy" && <AdminHierarchyPanel isSuper={isSuper} />}
      {tab === "messages" && <AdminMessagesPanel />}
      {tab === "audit" && <AdminAuditPanel />}


      {tab === "reg" && (
      <>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.k} size="sm" variant={filter === f.k ? "default" : "outline"} onClick={() => setFilter(f.k)}>
            {f.label}
          </Button>
        ))}
      </div>


      {listQ.isLoading ? (
        <p className="text-center text-sm py-8">లోడ్…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">ఈ ఫిల్టర్‌లో రిజిస్ట్రేషన్లు లేవు.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => {
            const status = r.verification_status as string;
            const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
            const color = status === "approved" ? "text-green-600" : status === "rejected" ? "text-destructive" : "text-amber-600";
            return (
              <Card key={r.user_id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {r.photo_signed_url ? (
                    <img src={r.photo_signed_url} alt={r.full_name} className="h-16 w-16 rounded-full object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                      {r.full_name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold truncate">{r.full_name}</h2>
                      <Badge variant="outline" className={color}>
                        <Icon className="h-3 w-3 mr-1" />{status}
                      </Badge>
                      <Badge variant="secondary">{r.primary_role}</Badge>
                      {r.provider_sub_type && <Badge variant="secondary">{r.provider_sub_type}</Badge>}
                      {r.provider_specialty && <Badge variant="secondary">{r.provider_specialty}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      {r.phone && <div>📞 {r.phone}</div>}
                      {(r.house_number || r.shop_name) && (
                        <div>🏠 {r.address_type === "shop" ? `Shop: ${r.shop_name}` : `H.No: ${r.house_number}`}</div>
                      )}
                      {(r.city || r.mandal || r.district) && (
                        <div>📍 {[r.city, r.mandal, r.district, r.state].filter(Boolean).join(", ")}</div>
                      )}
                      {r.experience_years != null && <div>⏳ {r.experience_years} yrs</div>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  {r.aadhaar_signed_url && (
                    <a href={r.aadhaar_signed_url} target="_blank" rel="noreferrer" className="underline text-[#1e3a8a] inline-flex items-center gap-1">
                      Aadhaar <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {r.license_signed_url && (
                    <a href={r.license_signed_url} target="_blank" rel="noreferrer" className="underline text-[#1e3a8a] inline-flex items-center gap-1">
                      License <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {r.store_photo_signed_url && (
                    <a href={r.store_photo_signed_url} target="_blank" rel="noreferrer" className="underline text-[#1e3a8a] inline-flex items-center gap-1">
                      Store <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {r.vehicle_photo_signed_url && (
                    <a href={r.vehicle_photo_signed_url} target="_blank" rel="noreferrer" className="underline text-[#1e3a8a] inline-flex items-center gap-1">
                      Vehicle <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {status === "pending" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="నోట్స్ (ఐచ్ఛికం)"
                      value={notes[r.user_id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.user_id]: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => act(r.user_id, "approve")} disabled={busy === r.user_id}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> ఆమోదించు
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => act(r.user_id, "reject")} disabled={busy === r.user_id}>
                        <XCircle className="h-4 w-4 mr-1" /> తిరస్కరించు
                      </Button>
                    </div>
                  </div>
                )}
                {status !== "pending" && r.verification_notes && (
                  <p className="text-xs text-muted-foreground">Notes: {r.verification_notes}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function PointsPanel() {
  const qc = useQueryClient();
  const getSettings = useServerFn(adminGetPointSettings);
  const saveSettings = useServerFn(adminUpdatePointSettings);
  const getOverview = useServerFn(adminPointsOverview);

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");
  const [q, setQ] = useState("");

  const settingsQ = useQuery({ queryKey: ["varadhi-point-settings"], queryFn: () => getSettings() });
  const overviewQ = useQuery({
    queryKey: ["varadhi-points-overview", state, district, mandal, q],
    queryFn: () => getOverview({ data: { state, district, mandal, q } }),
  });

  const [limit, setLimit] = useState<string>("");
  const [enforce, setEnforce] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openUser, setOpenUser] = useState<string | null>(null);

  useEffect(() => {
    const s: any = settingsQ.data?.settings;
    if (s) {
      setLimit(String(s.free_monthly_points ?? 10));
      setEnforce(!!s.enforce_limit);
    }
  }, [settingsQ.data]);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({ data: { free_monthly_points: Number(limit) || 0, enforce_limit: enforce } });
      toast.success("సెట్టింగ్‌లు సేవ్ అయ్యాయి");
      qc.invalidateQueries({ queryKey: ["varadhi-point-settings"] });
      qc.invalidateQueries({ queryKey: ["varadhi-points-overview"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setSaving(false);
    }
  }

  const ov: any = overviewQ.data;
  const rows: any[] = ov?.rows ?? [];
  const areas = ov?.areas ?? { states: [], districts: [], mandals: [] };
  const stateOptions: string[] = Array.from(new Set([...(areas.states ?? []), ...STATES]));

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-2">
          <Coins className="h-4 w-4" /> ఉచిత పాయింట్ల సెట్టింగ్
        </h2>
        <p className="text-xs text-muted-foreground">
          అప్‌లోడ్ / ఎడిట్ సేవ్ చేసినప్పుడు 1 పాయింట్, ట్రాన్స్‌పోర్ట్ లేదా సర్వీస్ పోస్టును క్లయింట్ సంప్రదించడానికి ఓపెన్ చేసినప్పుడు 1 పాయింట్ నమోదవుతుంది.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">నెలకు ఉచిత పాయింట్లు</label>
            <Input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="flex gap-1">
            {[5, 10, 15].map((n) => (
              <Button key={n} size="sm" variant="outline" onClick={() => setLimit(String(n))}>{n}</Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enforce} onCheckedChange={setEnforce} id="enforce" />
            <label htmlFor="enforce" className="text-xs">పరిమితి దాటితే సబ్‌స్క్రిప్షన్ అడగాలి</label>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>సేవ్</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-2">
          <MapPin className="h-4 w-4" /> ప్రాంతం వారీగా వెతకండి
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <select
            className={selectCls}
            value={state}
            onChange={(e) => { setState(e.target.value); setDistrict(""); setMandal(""); }}
          >
            <option value="">రాష్ట్రం (అన్నీ)</option>
            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className={selectCls}
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setMandal(""); }}
          >
            <option value="">జిల్లా (అన్నీ)</option>
            {Array.from(new Set([...(areas.districts ?? []), ...districtsFor(state)])).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select className={selectCls} value={mandal} onChange={(e) => setMandal(e.target.value)}>
            <option value="">మండలం (అన్నీ)</option>
            {(areas.mandals ?? []).map((m: string) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Input placeholder="పేరు లేదా ఫోన్ వెతకండి" value={q} onChange={(e) => setQ(e.target.value)} />
          {(state || district || mandal || q) && (
            <Button size="sm" variant="outline" onClick={() => { setState(""); setDistrict(""); setMandal(""); setQ(""); }}>
              క్లియర్
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#1e3a8a]">ఈ నెల వినియోగం</h2>
          <span className="text-xs text-muted-foreground">
            {rows.length} మంది · మొత్తం {ov?.total_points ?? 0} పాయింట్లు
          </span>
        </div>
      </Card>

      {overviewQ.isLoading ? (
        <p className="text-center text-sm py-8">లోడ్…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">ఈ ప్రాంతంలో రిజిస్టర్ అయినవారు లేరు.</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.user_id} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.profile?.full_name ?? r.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[r.profile?.phone, r.profile?.village, r.profile?.mandal, r.profile?.district, r.profile?.state]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[#1e3a8a]">{r.used} / {ov?.free_limit}</p>
                  <p className="text-[10px] text-muted-foreground">మిగిలినవి {r.remaining}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="secondary"><Upload className="h-3 w-3 mr-1" />అప్‌లోడ్ {r.upload}</Badge>
                <Badge variant="secondary"><Phone className="h-3 w-3 mr-1" />సంప్రదింపు {r.contact}</Badge>
                <Badge variant="outline">మొత్తం (అన్ని నెలలు) {r.total_all_time}</Badge>
                {r.subscribed ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">సబ్‌స్క్రయిబ్డ్ ({r.subscription?.plan})</Badge>
                ) : r.over_limit ? (
                  <Badge variant="destructive">పరిమితి దాటింది — సబ్‌స్క్రిప్షన్ అవసరం</Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] ml-auto"
                  onClick={() => setOpenUser(openUser === r.user_id ? null : r.user_id)}
                >
                  <HistoryIcon className="h-3 w-3 mr-1" />
                  {openUser === r.user_id ? "హిస్టరీ మూసివేయి" : "పాయింట్ల హిస్టరీ"}
                </Button>
              </div>
              {openUser === r.user_id && <UserPointHistory userId={r.user_id} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UserPointHistory({ userId }: { userId: string }) {
  const getHistory = useServerFn(adminUserPointHistory);
  const q = useQuery({
    queryKey: ["varadhi-point-history", userId],
    queryFn: () => getHistory({ data: { user_id: userId } }),
  });

  if (q.isLoading) return <p className="text-xs text-muted-foreground py-2">లోడ్…</p>;
  const events: any[] = (q.data as any)?.events ?? [];
  if (events.length === 0) return <p className="text-xs text-muted-foreground py-2">పాయింట్ల చరిత్ర లేదు.</p>;

  return (
    <div className="rounded-md border divide-y">
      <div className="px-2 py-1.5 text-[11px] font-semibold bg-muted/50">
        మొత్తం {(q.data as any)?.total ?? 0} పాయింట్లు · {events.length} నమోదులు
      </div>
      <div className="max-h-64 overflow-auto">
        {events.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-2 px-2 py-1.5 text-[11px] border-b last:border-0">
            <div className="min-w-0">
              <p className="font-medium">
                {e.event_type === "upload" ? "అప్‌లోడ్ / ఎడిట్" : "క్లయింట్ సంప్రదింపు"}
                {e.ref_title ? ` — ${e.ref_title}` : ""}
              </p>
              <p className="text-muted-foreground">
                {new Date(e.created_at).toLocaleString("te-IN")}
              </p>
            </div>
            <span className="shrink-0 font-bold text-[#1e3a8a]">+{e.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


