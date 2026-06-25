import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Megaphone, Users, ShieldCheck, ThumbsUp, HandHeart, Handshake, CheckCircle2, XCircle, Inbox, Loader2, User, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/chat")({
  head: () => ({ meta: [{ title: "Member Communications Hub" }] }),
  component: ChatHub,
});

type Tpl = "appreciation" | "condolence" | "help";

const TEMPLATES: Record<Tpl, { icon: any; label_en: string; label_te: string; msg_en: string; msg_te: string; tone: string }> = {
  appreciation: { icon: ThumbsUp, label_en: "Appreciation", label_te: "ప్రశంసించడం", msg_en: "Great job — thank you for your service.", msg_te: "మీ సేవలకు ధన్యవాదాలు. చాలా బాగా చేశారు.", tone: "#16a34a" },
  condolence: { icon: HandHeart, label_en: "Condolence", label_te: "ఓదార్చడం", msg_en: "Stay strong — we are with you.", msg_te: "ధైర్యంగా ఉండండి. మేము మీతో ఉన్నాము.", tone: "#dc2626" },
  help: { icon: Handshake, label_en: "Offer Help", label_te: "సహాయం ప్రకటించడం", msg_en: "I'm ready to support you.", msg_te: "నేను సహాయం అందించడానికి సిద్ధంగా ఉన్నాను.", tone: "#f59e0b" },
};

const ROLE_LABEL: Record<string, { te: string; en: string }> = {
  president: { te: "అధ్యక్షుడు", en: "President" },
  vice_president: { te: "ఉపాధ్యక్షుడు", en: "Vice President" },
  treasurer: { te: "కోశాధికారి", en: "Treasurer" },
  advisor: { te: "సలహాదారు", en: "Advisor" },
  executive: { te: "కార్యవర్గం", en: "Executive" },
  worker: { te: "కార్యకర్త", en: "Worker" },
};
const GENERAL_LABEL = { te: "సాధారణ సభ్యుడు", en: "General Member" };

function useLangPick() {
  const { lang } = useI18n();
  const isTe = lang === "te";
  return {
    lang,
    isTe,
    pick: <T,>(te: T, en: T) => (isTe ? te : en),
  };
}

type Ctx = {
  userId: string;
  orgId: string;
  myMemberId: string | null;
  isAdmin: boolean;
  isCommittee: boolean;
};

async function loadContext(): Promise<Ctx | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ownOrg } = await supabase.from("organizations").select("id").eq("admin_user_id", user.id).maybeSingle();
  let orgId = ownOrg?.id ?? null;
  let myMemberId: string | null = null;
  if (!orgId) {
    const { data: m } = await supabase.from("members").select("id, org_id").eq("user_id", user.id).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    orgId = m?.org_id ?? null;
    myMemberId = m?.id ?? null;
  } else {
    const { data: m } = await supabase.from("members").select("id").eq("user_id", user.id).eq("org_id", orgId).maybeSingle();
    myMemberId = m?.id ?? null;
  }
  if (!orgId) return null;
  const isAdmin = !!ownOrg?.id;
  let isCommittee = false;
  if (!isAdmin && myMemberId) {
    const { data: cm } = await supabase.from("committee_members").select("id").eq("org_id", orgId).eq("member_id", myMemberId).eq("is_active", true).limit(1);
    isCommittee = (cm?.length ?? 0) > 0;
  }
  return { userId: user.id, orgId, myMemberId, isAdmin, isCommittee };
}

function ChatHub() {
  const qc = useQueryClient();
  const ctxQ = useQuery({ queryKey: ["chat-ctx"], queryFn: loadContext });
  const { pick } = useLangPick();
  const ctx = ctxQ.data;
  const canBroadcast = !!ctx && (ctx.isAdmin || ctx.isCommittee);
  const canReview = canBroadcast;

  if (ctxQ.isLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }
  if (!ctx) {
    return <div className="min-h-screen bg-black text-white p-6">{pick("మీ ఖాతాకు సంస్థ లింక్ లేదు.", "No organization linked to your account.")}</div>;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/org/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> {pick("డాష్‌బోర్డ్", "Dashboard")}
        </Link>
        <Card className="p-4 bg-zinc-950 border-zinc-800">
          <h1 className="text-lg md:text-xl font-bold text-[#ff8c28]">{pick("సభ్యుల కమ్యూనికేషన్ హబ్", "Member Communications Hub")}</h1>
          <p className="text-xs text-zinc-400 mt-1">{pick("సభ్యులు మరియు కార్యవర్గం మధ్య నియంత్రిత, వివాద రహిత కమ్యూనికేషన్.", "Controlled, dispute-free communication between members and the working committee.")}</p>
        </Card>

        <Tabs defaultValue="announcements" className="w-full">
          <TabsList className="grid grid-cols-3 bg-zinc-950 border border-zinc-800">
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-black">
              <Megaphone className="w-4 h-4 mr-1" /> {pick("ప్రకటనలు", "Announcements")}
            </TabsTrigger>
            <TabsTrigger value="interactions" className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-1" /> {pick("సంభాషణలు", "Interactions")}
            </TabsTrigger>
            {canReview && (
              <TabsTrigger value="queue" className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-black">
                <ShieldCheck className="w-4 h-4 mr-1" /> {pick("ఆమోదాలు", "Approvals")}
              </TabsTrigger>
            )}
            {!canReview && <TabsTrigger value="inbox" className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-black"><Inbox className="w-4 h-4 mr-1" /> {pick("ఇన్‌బాక్స్", "Inbox")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="announcements"><AnnouncementsPanel ctx={ctx} canPost={canBroadcast} onChange={() => qc.invalidateQueries({ queryKey: ["announcements"] })} /></TabsContent>
          <TabsContent value="interactions"><InteractionsPanel ctx={ctx} /></TabsContent>
          {canReview && <TabsContent value="queue"><QueuePanel ctx={ctx} /></TabsContent>}
          {!canReview && <TabsContent value="inbox"><InboxPanel ctx={ctx} /></TabsContent>}
        </Tabs>
      </div>
    </div>
  );
}

function AnnouncementsPanel({ ctx, canPost, onChange }: { ctx: Ctx; canPost: boolean; onChange: () => void }) {
  const { pick } = useLangPick();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["announcements", ctx.orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_announcements").select("*").eq("org_id", ctx.orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function post() {
    if (!title.trim() || !body.trim()) return toast.error(pick("శీర్షిక మరియు సందేశం అవసరం", "Title and body required"));
    setBusy(true);
    const { error } = await supabase.from("chat_announcements").insert({ org_id: ctx.orgId, author_user_id: ctx.userId, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTitle(""); setBody("");
    toast.success(pick("పోస్ట్ చేయబడింది", "Posted"));
    onChange();
    q.refetch();
  }

  async function remove(id: string) {
    if (!confirm(pick("ఈ ప్రకటనను తొలగించాలా?", "Delete this announcement?"))) return;
    const { error } = await supabase.from("chat_announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    q.refetch();
  }

  return (
    <div className="space-y-3 mt-3">
      {canPost && (
        <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-[#ff8c28] uppercase">{pick("కొత్త ప్రకటన", "New Broadcast")}</p>
          <Input placeholder={pick("శీర్షిక", "Title")} value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" />
          <Textarea placeholder={pick("సందేశం…", "Message…")} rows={4} value={body} onChange={e => setBody(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" />
          <Button onClick={post} disabled={busy} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-black">{busy ? pick("పోస్ట్ చేస్తున్నాం…", "Posting…") : pick("ప్రకటన పోస్ట్ చేయండి", "Post Announcement")}</Button>
        </Card>
      )}
      {!canPost && (
        <Card className="p-3 bg-zinc-950 border-zinc-800 text-xs text-zinc-400">{pick("చదవడం మాత్రమే. కార్యవర్గం మాత్రమే పోస్ట్ చేయగలదు.", "Read-only feed. Only the Working Committee can post.")}</Card>
      )}
      {q.isLoading && <div className="text-zinc-500 text-sm">{pick("లోడ్ అవుతోంది…", "Loading…")}</div>}
      {q.data?.length === 0 && <Card className="p-6 text-center text-zinc-500 text-sm bg-zinc-950 border-zinc-800">{pick("ఇంకా ప్రకటనలు లేవు.", "No announcements yet.")}</Card>}
      {q.data?.map(a => (
        <Card key={a.id} className="p-4 bg-zinc-950 border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-white">{a.title}</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
            </div>
            {canPost && a.author_user_id === ctx.userId && (
              <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="text-red-400 hover:text-red-300 hover:bg-red-950">{pick("తొలగించు", "Delete")}</Button>
            )}
          </div>
          <p className="text-sm text-zinc-200 mt-2 whitespace-pre-wrap">{a.body}</p>
        </Card>
      ))}
    </div>
  );
}

function MemberAvatar({ name, url }: { name?: string | null; url?: string | null }) {
  const [broken, setBroken] = useState(false);
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  if (url && !broken) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
        <img src={url} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#ff8c28] to-[#b35500] text-black font-bold text-sm">
      {initial === "?" ? <User className="w-5 h-5" /> : initial}
    </div>
  );
}

function InteractionsPanel({ ctx }: { ctx: Ctx }) {
  const { lang, pick, isTe } = useLangPick();
  const membersQ = useQuery({
    queryKey: ["org-members-mini", ctx.orgId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("members")
        .select("id, name, member_code, photo_url")
        .eq("org_id", ctx.orgId).eq("status", "approved").order("name");
      if (error) throw error;
      const { data: committee } = await supabase
        .from("committee_members")
        .select("member_id, role")
        .eq("org_id", ctx.orgId).eq("is_active", true);
      const roleMap = new Map<string, string>();
      (committee ?? []).forEach((c: any) => {
        if (!roleMap.has(c.member_id)) roleMap.set(c.member_id, c.role);
      });
      return (members ?? []).map((m) => ({ ...m, role: roleMap.get(m.id) ?? null }));
    },
  });
  const sentQ = useQuery({
    queryKey: ["chat-sent", ctx.orgId, ctx.userId],
    queryFn: async () => {
      const { data } = await supabase.from("chat_interactions").select("*").eq("sender_user_id", ctx.userId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const [picked, setPicked] = useState<any | null>(null);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => (membersQ.data ?? []).filter(m =>
    !search.trim() || m.name?.toLowerCase().includes(search.toLowerCase()) || m.member_code?.toLowerCase().includes(search.toLowerCase())
  ).filter(m => m.id !== ctx.myMemberId), [membersQ.data, search, ctx.myMemberId]);

  async function send() {
    if (!picked || !tpl) return;
    setSending(true);
    const t = TEMPLATES[tpl];
    const { error } = await supabase.from("chat_interactions").insert({
      org_id: ctx.orgId,
      sender_user_id: ctx.userId,
      sender_member_id: ctx.myMemberId,
      recipient_member_id: picked.id,
      template_type: tpl,
      message_te: t.msg_te,
      message_en: t.msg_en,
      status: "pending",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(pick("కార్యవర్గం ఆమోదం కోసం పంపబడింది", "Sent for committee approval"));
    setPicked(null); setTpl(null);
    sentQ.refetch();
  }

  if (!ctx.myMemberId && !ctx.isAdmin) {
    return <Card className="mt-3 p-4 bg-zinc-950 border-zinc-800 text-sm text-zinc-400">{pick("ఆమోదిత సభ్యులు మాత్రమే సంభాషణలు పంపగలరు.", "Only approved members can send interactions.")}</Card>;
  }

  return (
    <div className="space-y-3 mt-3">
      {ctx.myMemberId && (
        <Link
          to="/member/loan-request"
          className="flex items-center justify-between gap-3 p-4 rounded-lg bg-gradient-to-r from-[#ff8c28]/20 to-amber-900/20 border border-[#ff8c28]/40 hover:border-[#ff8c28] transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#ff8c28]/20 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 text-[#ff8c28]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{pick("అప్పు కొరకు అభ్యర్థన", "Request Loan")}</p>
              <p className="text-[11px] text-zinc-400 truncate">
                {pick("మొత్తం, ఉద్దేశం, తిరిగి చెల్లింపు కాలవ్యవధి — కార్యవర్గం ఆమోద క్యూకు వెళుతుంది.", "Amount, purpose, tenure — routes to the Working Committee's approval queue.")}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#ff8c28] shrink-0">{pick("ప్రారంభించు →", "Open →")}</span>
        </Link>
      )}

      <Card className="p-3 bg-zinc-950 border-zinc-800">
        <p className="text-[11px] text-zinc-400 mb-2">{pick("ఒక సభ్యుని ఎంచుకోండి. వివాదాలను నివారించడానికి ముందుగా ఆమోదించబడిన 3 టెంప్లేట్‌లలో ఒకటి మాత్రమే పంపగలరు — ఉచిత టెక్స్ట్ నిషేధించబడింది.", "Pick a member. You can only send one of three pre-approved templates — free text is disabled to prevent disputes.")}</p>
        <Input placeholder={pick("సభ్యులను వెతకండి…", "Search members…")} value={search} onChange={e => setSearch(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(m => {
          const roleLabel = m.role
            ? (isTe ? ROLE_LABEL[m.role]?.te : ROLE_LABEL[m.role]?.en) ?? m.role
            : pick(GENERAL_LABEL.te, GENERAL_LABEL.en);
          const isCommitteeMember = !!m.role;
          return (
            <button key={m.id} type="button" onClick={() => { setPicked(m); setTpl(null); }}
              className="text-left p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-[#ff8c28] transition flex items-center gap-3">
              <MemberAvatar name={m.name} url={m.photo_url} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{m.name}</p>
                <p className="text-[10px] text-zinc-500 font-mono">{m.member_code ?? "—"}</p>
                <p className={`text-[10px] mt-0.5 truncate ${isCommitteeMember ? "text-[#ff8c28]" : "text-zinc-500"}`}>{roleLabel}</p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <Card className="p-4 bg-zinc-950 border-zinc-800 text-zinc-500 text-sm text-center">{pick("సభ్యులు కనుగొనబడలేదు.", "No members found.")}</Card>}
      </div>

      {sentQ.data && sentQ.data.length > 0 && (
        <Card className="p-3 bg-zinc-950 border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 mb-2">{pick("మీ ఇటీవలి సందేశాలు", "Your recent messages")}</p>
          <div className="space-y-1">
            {sentQ.data.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs text-zinc-400 py-1 border-b border-zinc-800 last:border-0">
                <span>{isTe ? TEMPLATES[s.template_type as Tpl]?.label_te : TEMPLATES[s.template_type as Tpl]?.label_en}</span>
                <span className={s.status === "approved" ? "text-green-400" : s.status === "rejected" ? "text-red-400" : "text-amber-400"}>{s.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!picked} onOpenChange={(o) => !o && (setPicked(null), setTpl(null))}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{pick("వీరికి:", "To:")} {picked?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(Object.keys(TEMPLATES) as Tpl[]).map(k => {
              const t = TEMPLATES[k];
              const Icon = t.icon;
              const active = tpl === k;
              return (
                <button key={k} type="button" onClick={() => setTpl(k)}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-start gap-3 ${active ? "border-[#ff8c28] bg-[#ff8c28]/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: t.tone }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{isTe ? t.label_te : t.label_en}</p>
                    <p className="text-xs text-zinc-300 mt-1">{isTe ? t.msg_te : t.msg_en}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => { setPicked(null); setTpl(null); }}>{pick("రద్దు", "Cancel")}</Button>
            <Button disabled={!tpl || sending} onClick={send} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-black">{sending ? pick("పంపుతోంది…", "Sending…") : pick("ఆమోదానికి పంపండి", "Send for Approval")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* lang dep */}
      <span className="hidden">{lang}</span>
    </div>
  );
}

function QueuePanel({ ctx }: { ctx: Ctx }) {
  const { pick, isTe } = useLangPick();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const q = useQuery({
    queryKey: ["chat-queue", ctx.orgId, tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_interactions")
        .select("*, sender:sender_member_id(id, name, member_code), recipient:recipient_member_id(id, name, member_code)")
        .eq("org_id", ctx.orgId).eq("status", tab).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function review(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("chat_interactions").update({ status, reviewed_by: ctx.userId, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? pick("గ్రహీతకు పంపబడింది", "Delivered to recipient") : pick("తిరస్కరించబడింది", "Rejected"));
    q.refetch();
  }

  const tabLabel = (s: string) =>
    pick(
      { pending: "పెండింగ్", approved: "ఆమోదించబడింది", rejected: "తిరస్కరించబడింది" }[s] ?? s,
      s[0].toUpperCase() + s.slice(1),
    );

  return (
    <div className="space-y-3 mt-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map(s => (
          <Button key={s} size="sm" variant={tab === s ? "default" : "outline"}
            className={tab === s ? "bg-[#ff8c28] text-black hover:bg-[#ff8c28]/90" : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"}
            onClick={() => setTab(s)}>{tabLabel(s)}</Button>
        ))}
      </div>
      {q.data?.length === 0 && <Card className="p-6 text-center text-zinc-500 text-sm bg-zinc-950 border-zinc-800">{pick("ఇక్కడ ఏమీ లేదు.", "Nothing here.")}</Card>}
      {q.data?.map((r: any) => {
        const t = TEMPLATES[r.template_type as Tpl];
        const Icon = t?.icon ?? Megaphone;
        return (
          <Card key={r.id} className="p-3 bg-zinc-950 border-zinc-800">
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: t?.tone }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400">
                  <span className="text-white">{r.sender?.name ?? "?"}</span> → <span className="text-white">{r.recipient?.name ?? "?"}</span>
                </p>
                <p className="text-sm text-zinc-200 mt-1">{isTe ? r.message_te : r.message_en}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              {tab === "pending" && (
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => review(r.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="w-4 h-4 mr-1" />{pick("ఆమోదించు", "Approve")}</Button>
                  <Button size="sm" variant="outline" onClick={() => review(r.id, "rejected")} className="border-red-900 bg-red-950 text-red-200 hover:bg-red-900"><XCircle className="w-4 h-4 mr-1" />{pick("తిరస్కరించు", "Reject")}</Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function InboxPanel({ ctx }: { ctx: Ctx }) {
  const { pick, isTe } = useLangPick();
  const q = useQuery({
    queryKey: ["chat-inbox", ctx.orgId, ctx.myMemberId],
    enabled: !!ctx.myMemberId,
    queryFn: async () => {
      const { data } = await supabase.from("chat_interactions")
        .select("*, sender:sender_member_id(name, member_code)")
        .eq("recipient_member_id", ctx.myMemberId!).eq("status", "approved").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  if (!ctx.myMemberId) return <Card className="p-4 mt-3 bg-zinc-950 border-zinc-800 text-zinc-400 text-sm">{pick("సభ్య ప్రొఫైల్ లింక్ లేదు.", "No member profile linked.")}</Card>;
  return (
    <div className="space-y-2 mt-3">
      {q.data?.length === 0 && <Card className="p-6 text-center text-zinc-500 text-sm bg-zinc-950 border-zinc-800">{pick("ఇన్‌బాక్స్ ఖాళీగా ఉంది.", "Inbox is empty.")}</Card>}
      {q.data?.map((r: any) => {
        const t = TEMPLATES[r.template_type as Tpl];
        const Icon = t?.icon ?? Megaphone;
        return (
          <Card key={r.id} className="p-3 bg-zinc-950 border-zinc-800 flex items-start gap-3">
            <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: t?.tone }} />
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">{pick("నుండి", "From")} <span className="text-white">{r.sender?.name ?? "Member"}</span></p>
              <p className="text-sm text-zinc-200 mt-1">{isTe ? r.message_te : r.message_en}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{new Date(r.reviewed_at ?? r.created_at).toLocaleString()}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
