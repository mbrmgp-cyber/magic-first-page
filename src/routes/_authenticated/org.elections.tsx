import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Vote, ArrowLeft, Plus, CalendarClock, UserCheck, Trophy, CheckCircle2,
  XCircle, Trash2, ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/org/elections")({
  head: () => ({ meta: [{ title: "Board Elections — MBR App" }] }),
  component: ElectionsPage,
});

const sb = supabase as any;

type Election = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  positions: string[];
  nomination_deadline: string;
  election_date: string;
  status: "scheduled" | "nominations_open" | "voting_open" | "completed" | "cancelled";
};

type Nomination = {
  id: string;
  election_id: string;
  org_id: string;
  member_id: string;
  position: string;
  statement: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  members?: { name: string; photo_url: string | null };
};

type VoteRow = {
  id: string;
  election_id: string;
  position: string;
  voter_member_id: string;
  nominee_id: string;
};

const STATUS_LABEL: Record<Election["status"], { te: string; cls: string }> = {
  scheduled: { te: "షెడ్యూల్", cls: "bg-zinc-700 text-zinc-200" },
  nominations_open: { te: "నామినేషన్లు తెరిచారు", cls: "bg-blue-600 text-white" },
  voting_open: { te: "ఓటింగ్ జరుగుతోంది", cls: "bg-amber-600 text-white" },
  completed: { te: "పూర్తయింది", cls: "bg-emerald-600 text-white" },
  cancelled: { te: "రద్దు", cls: "bg-red-700 text-white" },
};

function ElectionsPage() {
  const qc = useQueryClient();
  const [ctx, setCtx] = useState<{ orgId: string; memberId: string | null; isAdmin: boolean; isCommittee: boolean } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<{ e: Election; tab: "overview" | "nominate" | "vote" | "results" } | null>(null);


  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ownOrg } = await sb.from("organizations").select("id, admin_user_id").eq("admin_user_id", user.id).maybeSingle();
      let orgId: string | null = ownOrg?.id ?? null;
      let memberId: string | null = null;
      let isCommittee = false;
      const isAdmin = !!ownOrg;
      if (!orgId) {
        const { data: m } = await sb.from("members").select("id, org_id").eq("user_id", user.id).eq("status", "approved").maybeSingle();
        orgId = m?.org_id ?? null;
        memberId = m?.id ?? null;
      } else {
        const { data: m } = await sb.from("members").select("id").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
        memberId = m?.id ?? null;
      }
      if (orgId && memberId) {
        const { data: cm } = await sb.from("committee_members").select("id").eq("org_id", orgId).eq("member_id", memberId).eq("is_active", true).maybeSingle();
        isCommittee = !!cm;
      }
      if (orgId) setCtx({ orgId, memberId, isAdmin, isCommittee });
    })();
  }, []);

  const electionsQ = useQuery({
    queryKey: ["org-elections", ctx?.orgId],
    enabled: !!ctx?.orgId,
    queryFn: async () => {
      const { data, error } = await sb.from("org_elections").select("*").eq("org_id", ctx!.orgId).order("election_date", { ascending: false });
      if (error) throw error;
      return data as Election[];
    },
  });

  if (!ctx) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/org/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-300 hover:bg-zinc-900 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back / వెనుకకు
            </Button>
          </Link>
          {ctx.isAdmin && (
            <Button onClick={() => setNewOpen(true)} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
              <Plus className="w-4 h-4 mr-1" /> కొత్త ఎన్నిక
            </Button>
          )}
        </div>

        <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-[0_0_40px_rgba(255,140,40,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#ff8c28]/15 border border-[#ff8c28]/40">
              <Vote className="w-6 h-6 text-[#ff8c28]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Board Elections</h1>
              <p className="text-sm text-zinc-400">బోర్డు ఎన్నికలు — షెడ్యూల్, నామినేషన్లు, ఓటింగ్ & ఫలితాలు</p>
            </div>
          </div>
        </Card>

        {electionsQ.isLoading && <p className="text-zinc-400 text-sm">లోడ్ అవుతోంది…</p>}
        {electionsQ.data?.length === 0 && (
          <Card className="p-8 bg-zinc-950 border-zinc-800 text-center text-zinc-400">
            ఇంకా ఏ ఎన్నిక షెడ్యూల్ చేయలేదు.
          </Card>
        )}

        <div className="grid gap-3">
          {electionsQ.data?.map((e) => (
            <ElectionCard key={e.id} e={e} onOpen={() => setSelected(e)} />
          ))}
        </div>
      </div>

      <NewElectionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        orgId={ctx.orgId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["org-elections"] })}
      />

      {selected && (
        <ElectionDetailDialog
          election={selected}
          ctx={ctx}
          onClose={() => setSelected(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["org-elections"] });
            qc.invalidateQueries({ queryKey: ["election-detail", selected.id] });
          }}
        />
      )}
    </div>
  );
}

function ElectionCard({ e, onOpen }: { e: Election; onOpen: () => void }) {
  const st = STATUS_LABEL[e.status];
  return (
    <Card onClick={onOpen} className="p-4 bg-zinc-950 border-zinc-800 hover:border-[#ff8c28]/60 cursor-pointer transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-white truncate">{e.title}</h3>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" /> ఎన్నిక: {new Date(e.election_date).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">నామినేషన్ గడువు: {new Date(e.nomination_deadline).toLocaleString()}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {e.positions.map((p) => (
              <Badge key={p} variant="outline" className="border-zinc-700 text-zinc-300 text-[10px]">{p}</Badge>
            ))}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${st.cls}`}>{st.te}</span>
      </div>
    </Card>
  );
}

function NewElectionDialog({ open, onOpenChange, orgId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; orgId: string; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [positions, setPositions] = useState("President, Secretary, Treasurer");
  const [nomDl, setNomDl] = useState("");
  const [elecDt, setElecDt] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !nomDl || !elecDt) { toast.error("అన్ని ఫీల్డ్‌లు అవసరం"); return; }
    setBusy(true);
    const posArr = positions.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await sb.from("org_elections").insert({
      org_id: orgId, title: title.trim(), description: desc.trim() || null,
      positions: posArr, nomination_deadline: new Date(nomDl).toISOString(),
      election_date: new Date(elecDt).toISOString(), status: "scheduled",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ఎన్నిక సృష్టించబడింది");
    setTitle(""); setDesc(""); setPositions("President, Secretary, Treasurer"); setNomDl(""); setElecDt("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
        <DialogHeader><DialogTitle>కొత్త ఎన్నిక షెడ్యూల్</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>శీర్షిక</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" placeholder="2026 వార్షిక బోర్డు ఎన్నికలు" /></div>
          <div><Label>వివరణ (ఐచ్ఛికం)</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" rows={2} /></div>
          <div><Label>పదవులు (కామాతో వేరు చేయండి)</Label><Input value={positions} onChange={(e) => setPositions(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" /></div>
          <div className="grid grid-cols-1 gap-3">
            <div><Label>నామినేషన్ గడువు</Label><Input type="datetime-local" value={nomDl} onChange={(e) => setNomDl(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" /></div>
            <div><Label>ఎన్నిక తేదీ & సమయం</Label><Input type="datetime-local" value={elecDt} onChange={(e) => setElecDt(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 bg-zinc-900 text-white">రద్దు</Button>
          <Button onClick={save} disabled={busy} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">{busy ? "సేవ్…" : "సృష్టించు"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ElectionDetailDialog({ election, ctx, onClose, onChanged }: {
  election: Election;
  ctx: { orgId: string; memberId: string | null; isAdmin: boolean; isCommittee: boolean };
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "nominate" | "vote" | "results">("overview");

  const nomsQ = useQuery({
    queryKey: ["election-detail", election.id, "noms"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("org_election_nominations")
        .select("*, members(name, photo_url)")
        .eq("election_id", election.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Nomination[];
    },
  });

  const votesQ = useQuery({
    queryKey: ["election-detail", election.id, "votes"],
    queryFn: async () => {
      const { data, error } = await sb.from("org_election_votes").select("*").eq("election_id", election.id);
      if (error) throw error;
      return data as VoteRow[];
    },
  });

  async function setStatus(s: Election["status"]) {
    const { error } = await sb.from("org_elections").update({ status: s }).eq("id", election.id);
    if (error) return toast.error(error.message);
    toast.success("స్థితి అప్‌డేట్ అయింది");
    onChanged();
  }

  async function deleteElection() {
    if (!confirm("ఈ ఎన్నికను డిలీట్ చేయాలా?")) return;
    const { error } = await sb.from("org_elections").delete().eq("id", election.id);
    if (error) return toast.error(error.message);
    toast.success("డిలీట్ చేయబడింది");
    onChanged(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-[#ff8c28]" /> {election.title}
          </DialogTitle>
          <p className="text-xs text-zinc-400">
            ఎన్నిక: {new Date(election.election_date).toLocaleString()} • స్థితి: {STATUS_LABEL[election.status].te}
          </p>
        </DialogHeader>

        {ctx.isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Select value={election.status} onValueChange={(v) => setStatus(v as Election["status"])}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white h-8 w-auto"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value="scheduled">షెడ్యూల్</SelectItem>
                <SelectItem value="nominations_open">నామినేషన్లు తెరువు</SelectItem>
                <SelectItem value="voting_open">ఓటింగ్ తెరువు</SelectItem>
                <SelectItem value="completed">పూర్తి చేయి</SelectItem>
                <SelectItem value="cancelled">రద్దు</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={deleteElection} className="border-red-900 bg-red-950 text-red-200 hover:bg-red-900">
              <Trash2 className="w-4 h-4 mr-1" /> డిలీట్
            </Button>
          </div>
        )}

        <div className="flex border-b border-zinc-800 text-xs">
          {[
            { k: "overview", l: "వివరాలు" },
            { k: "nominate", l: "నామినేషన్లు" },
            { k: "vote", l: "ఓటు వేయండి" },
            { k: "results", l: "ఫలితాలు" },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`px-3 py-2 ${tab === t.k ? "text-[#ff8c28] border-b-2 border-[#ff8c28]" : "text-zinc-400"}`}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-2 text-sm">
            {election.description && <p className="text-zinc-300">{election.description}</p>}
            <p className="text-zinc-400">నామినేషన్ గడువు: {new Date(election.nomination_deadline).toLocaleString()}</p>
            <div>
              <p className="text-zinc-400 mb-1">పదవులు:</p>
              <div className="flex flex-wrap gap-1">
                {election.positions.map((p) => (
                  <Badge key={p} className="bg-[#ff8c28]/15 text-[#ff8c28] border border-[#ff8c28]/40">{p}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "nominate" && (
          <NominateTab
            election={election} ctx={ctx} noms={nomsQ.data ?? []}
            onChanged={() => nomsQ.refetch()}
          />
        )}

        {tab === "vote" && (
          <VoteTab
            election={election} ctx={ctx}
            noms={(nomsQ.data ?? []).filter(n => n.status === "approved")}
            votes={votesQ.data ?? []}
            onVoted={() => { votesQ.refetch(); }}
          />
        )}

        {tab === "results" && (
          <ResultsTab
            election={election}
            noms={(nomsQ.data ?? []).filter(n => n.status === "approved")}
            votes={votesQ.data ?? []}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NominateTab({ election, ctx, noms, onChanged }: {
  election: Election;
  ctx: { orgId: string; memberId: string | null; isAdmin: boolean; isCommittee: boolean };
  noms: Nomination[];
  onChanged: () => void;
}) {
  const [position, setPosition] = useState(election.positions[0] ?? "");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);

  const canFile = election.status === "nominations_open" && !!ctx.memberId;

  async function file() {
    if (!ctx.memberId) return;
    setBusy(true);
    const { error } = await sb.from("org_election_nominations").insert({
      election_id: election.id, org_id: ctx.orgId, member_id: ctx.memberId,
      position, statement: statement.trim() || null, status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("నామినేషన్ ఫైల్ చేయబడింది — అడ్మిన్ ఆమోదం పెండింగ్");
    setStatement("");
    onChanged();
  }

  async function review(id: string, status: "approved" | "rejected") {
    const { error } = await sb.from("org_election_nominations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "ఆమోదించబడింది" : "తిరస్కరించబడింది");
    onChanged();
  }

  return (
    <div className="space-y-4">
      {canFile && (
        <Card className="p-3 bg-zinc-900 border-zinc-800 space-y-2">
          <p className="text-sm font-semibold text-[#ff8c28]">నా నామినేషన్ ఫైల్ చేయండి</p>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
              {election.positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="మీ ప్రకటన / అర్హతలు…" rows={3} className="bg-zinc-950 border-zinc-800 text-white" />
          <Button onClick={file} disabled={busy} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white w-full">{busy ? "పంపుతోంది…" : "నామినేషన్ సమర్పించు"}</Button>
        </Card>
      )}
      {!canFile && election.status !== "nominations_open" && (
        <p className="text-xs text-zinc-500">నామినేషన్లు ప్రస్తుతం తెరువబడలేదు.</p>
      )}

      <div className="space-y-2">
        {election.positions.map((pos) => {
          const list = noms.filter(n => n.position === pos);
          if (list.length === 0) return null;
          return (
            <div key={pos}>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{pos}</p>
              <div className="space-y-1.5">
                {list.map((n) => (
                  <Card key={n.id} className="p-2.5 bg-zinc-900 border-zinc-800 flex items-center gap-3">
                    {n.members?.photo_url ? (
                      <img src={n.members.photo_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs">{n.members?.name?.[0] ?? "?"}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.members?.name}</p>
                      {n.statement && <p className="text-[11px] text-zinc-400 truncate">{n.statement}</p>}
                    </div>
                    <Badge className={
                      n.status === "approved" ? "bg-emerald-600 text-white" :
                      n.status === "rejected" ? "bg-red-700 text-white" :
                      "bg-zinc-700 text-zinc-200"
                    }>
                      {n.status === "approved" ? "ఆమోదం" : n.status === "rejected" ? "తిరస్కృతం" : n.status === "withdrawn" ? "ఉపసంహరణ" : "పెండింగ్"}
                    </Badge>
                    {ctx.isAdmin && n.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => review(n.id, "approved")} className="h-7 w-7 text-emerald-400 hover:bg-emerald-950"><CheckCircle2 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => review(n.id, "rejected")} className="h-7 w-7 text-red-400 hover:bg-red-950"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {noms.length === 0 && <p className="text-xs text-zinc-500">ఇంకా నామినేషన్లు లేవు.</p>}
      </div>
    </div>
  );
}

function VoteTab({ election, ctx, noms, votes, onVoted }: {
  election: Election;
  ctx: { orgId: string; memberId: string | null; isAdmin: boolean; isCommittee: boolean };
  noms: Nomination[];
  votes: VoteRow[];
  onVoted: () => void;
}) {
  const canVote = election.status === "voting_open" && ctx.isCommittee && !!ctx.memberId;
  const myVotes = useMemo(() => {
    const map = new Map<string, string>(); // position -> nominee_id
    votes.forEach(v => { if (v.voter_member_id === ctx.memberId) map.set(v.position, v.nominee_id); });
    return map;
  }, [votes, ctx.memberId]);

  async function castVote(nomineeId: string, position: string) {
    if (!ctx.memberId) return;
    const { error } = await sb.from("org_election_votes").insert({
      election_id: election.id, org_id: ctx.orgId, position,
      voter_member_id: ctx.memberId, nominee_id: nomineeId,
    });
    if (error) return toast.error(error.message);
    toast.success("ఓటు నమోదు అయింది");
    onVoted();
  }

  if (!canVote) {
    return (
      <div className="p-4 text-center text-zinc-400 text-sm space-y-1">
        <ShieldCheck className="w-6 h-6 mx-auto text-zinc-600" />
        {election.status !== "voting_open" ? <p>ఓటింగ్ ప్రస్తుతం తెరువబడలేదు.</p> : <p>కార్యవర్గ సభ్యులు మాత్రమే ఓటు వేయగలరు.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {election.positions.map((pos) => {
        const candidates = noms.filter(n => n.position === pos);
        const myChoice = myVotes.get(pos);
        return (
          <div key={pos}>
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{pos}</p>
            {candidates.length === 0 && <p className="text-[11px] text-zinc-600">అభ్యర్థులు లేరు.</p>}
            <div className="grid gap-1.5">
              {candidates.map((c) => {
                const chosen = myChoice === c.id;
                return (
                  <button
                    key={c.id}
                    disabled={!!myChoice}
                    onClick={() => castVote(c.id, pos)}
                    className={`flex items-center gap-3 p-2.5 rounded-md border text-left transition ${
                      chosen ? "border-emerald-500 bg-emerald-950/40" :
                      myChoice ? "border-zinc-800 bg-zinc-950 opacity-60" :
                      "border-zinc-800 bg-zinc-900 hover:border-[#ff8c28]"
                    }`}
                  >
                    {c.members?.photo_url ? <img src={c.members.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">{c.members?.name?.[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{c.members?.name}</p>
                      {c.statement && <p className="text-[11px] text-zinc-400 truncate">{c.statement}</p>}
                    </div>
                    {chosen && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            {myChoice && <p className="text-[10px] text-emerald-400 mt-1"><UserCheck className="w-3 h-3 inline" /> మీ ఓటు నమోదైంది</p>}
          </div>
        );
      })}
    </div>
  );
}

function ResultsTab({ election, noms, votes }: {
  election: Election; noms: Nomination[]; votes: VoteRow[];
}) {
  const tallies = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    election.positions.forEach(p => map[p] = {});
    votes.forEach(v => {
      if (!map[v.position]) map[v.position] = {};
      map[v.position][v.nominee_id] = (map[v.position][v.nominee_id] ?? 0) + 1;
    });
    return map;
  }, [votes, election.positions]);

  return (
    <div className="space-y-3">
      {election.status !== "completed" && (
        <p className="text-[11px] text-amber-400">ప్రాథమిక ఫలితాలు — ఎన్నిక ఇంకా పూర్తి కాలేదు.</p>
      )}
      {election.positions.map((pos) => {
        const candidates = noms.filter(n => n.position === pos);
        const counts = tallies[pos] ?? {};
        const sorted = [...candidates].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
        const total = candidates.reduce((s, c) => s + (counts[c.id] ?? 0), 0);
        const winner = sorted[0];
        return (
          <Card key={pos} className="p-3 bg-zinc-900 border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">{pos}</p>
              {winner && (counts[winner.id] ?? 0) > 0 && (
                <Badge className="bg-amber-600 text-white"><Trophy className="w-3 h-3 mr-1" />{winner.members?.name}</Badge>
              )}
            </div>
            {sorted.length === 0 && <p className="text-xs text-zinc-500">అభ్యర్థులు లేరు.</p>}
            <div className="space-y-1.5">
              {sorted.map((c, i) => {
                const v = counts[c.id] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-xs">
                      <span className={i === 0 && v > 0 ? "text-amber-400 font-semibold" : "text-zinc-300"}>{c.members?.name}</span>
                      <span className="text-zinc-400">{v} ఓట్లు ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded mt-0.5 overflow-hidden">
                      <div className={`h-full ${i === 0 && v > 0 ? "bg-amber-500" : "bg-[#ff8c28]/60"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
