import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n, localizeText } from "@/lib/i18n";
import { DISCIPLINARY_ROLES, disciplinaryRoleCopy, parseDisciplinaryRole, type DisciplinaryRole } from "@/lib/disciplinary-roles";
import {
  getDisciplinaryOverview,
  appointDisciplinaryMember,
  removeDisciplinaryMember,
  issueSuspension,
  revokeSuspension,
  nominatePresident,
  voteNomination,
  decideNomination,
  setElectionMode,
} from "@/lib/disciplinary.functions";
import {
  listOrgLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "@/lib/leave-requests.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Gavel, UserPlus, Ban, Vote, ArrowLeft, Trash2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, AlertTriangle, DoorOpen, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/org/disciplinary")({
  head: () => ({ meta: [
    { title: "Disciplinary Committee — MBR Platform" },
    { name: "description", content: "Manage society disciplinary committee appointments, suspensions and leadership on MBR Platform." },
    { property: "og:title", content: "Disciplinary Committee — MBR Platform" },
    { property: "og:description", content: "Society disciplinary committee appointments, member photos and leadership." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DisciplinaryPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-red-500">Error: {String((error as Error)?.message ?? error)}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function DisciplinaryPage() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getDisciplinaryOverview);
  const q = useQuery({ queryKey: ["disciplinary-overview"], queryFn: () => fetchOverview() });

  const appoint = useServerFn(appointDisciplinaryMember);
  const removeM = useServerFn(removeDisciplinaryMember);
  const issue = useServerFn(issueSuspension);
  const revoke = useServerFn(revokeSuspension);
  const nominate = useServerFn(nominatePresident);
  const vote = useServerFn(voteNomination);
  const decide = useServerFn(decideNomination);
  const setElec = useServerFn(setElectionMode);

  const [tab, setTab] = useState<"committee" | "suspensions" | "leadership" | "leave">("committee");

  const fetchLeave = useServerFn(listOrgLeaveRequests);
  const leaveQ = useQuery({ queryKey: ["org-leave-requests"], queryFn: () => fetchLeave(), refetchInterval: 30_000 });
  const approveLeave = useServerFn(approveLeaveRequest);
  const rejectLeave = useServerFn(rejectLeaveRequest);
  const [leaveNotes, setLeaveNotes] = useState<Record<string, string>>({});
  const invalidateLeave = () => qc.invalidateQueries({ queryKey: ["org-leave-requests"] });

  // Appoint form
  const [apMember, setApMember] = useState("");
  const [apRole, setApRole] = useState<DisciplinaryRole>("founder");
  const [apNotes, setApNotes] = useState("");

  // Suspension form
  const [sTarget, setSTarget] = useState("");
  const [sReason, setSReason] = useState("");
  const [sCategory, setSCategory] = useState<"rule_violation" | "misuse" | "reputation_damage" | "financial_loss" | "other">("rule_violation");
  const [sUntil, setSUntil] = useState("");
  const [sNotes, setSNotes] = useState("");

  // Nominate form
  const [nCandidate, setNCandidate] = useState("");
  const [nNotes, setNNotes] = useState("");

  if (q.isLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  const data = q.data;
  if (!data) return null;
  const { canManage, committee, suspensions, nominations, electionMode, members } = data as any;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["disciplinary-overview"] });

  async function onAppoint() {
    if (!apMember) return toast.error("Select a member");
    try {
      await appoint({ data: { member_id: apMember, role: apRole, notes: apNotes || undefined } });
      toast.success("Committee member added");
      setApMember(""); setApNotes("");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onIssue() {
    if (!sTarget || !sReason.trim()) return toast.error("Target and reason required");
    try {
      await issue({ data: { target_member_id: sTarget, reason: sReason, category: sCategory, effective_until: sUntil || null, notes: sNotes } });
      toast.success("Suspension order issued");
      setSTarget(""); setSReason(""); setSUntil(""); setSNotes("");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onNominate() {
    if (!nCandidate) return toast.error("Select a candidate");
    try {
      await nominate({ data: { candidate_member_id: nCandidate, notes: nNotes || undefined } });
      toast.success("Nomination created");
      setNCandidate(""); setNNotes("");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
  }

  const roleLabel = (r: string) => {
    const copy = disciplinaryRoleCopy[r];
    return copy ? localizeText(copy, lang) : r;
  };
  const catLabel: Record<string, string> = {
    rule_violation: "Rule Violation",
    misuse: "Misuse of Society",
    reputation_damage: "Reputation Damage",
    financial_loss: "Financial / Operational Loss",
    other: "Other",
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/org/dashboard" className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Back to Dashboard
          </Link>
          {electionMode && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
              Election Mode Active · ఎన్నికల మోడ్
            </Badge>
          )}
        </div>

        <Card className="p-4 bg-card">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-6 text-red-500" />
            <div>
              <h1 className="text-lg md:text-xl font-bold">Disciplinary Committee · క్రమశిక్షణా కమిటీ</h1>
              <p className="text-xs text-muted-foreground">
                {localizeText({ en: "Supreme advisory body — Founders, Sincere Seniors & Present Presidents. Appoints President, issues suspensions, unlocks Election Mode.", te: "అత్యున్నత సలహా మండలి — వ్యవస్థాపకులు, నిబద్ధతగల సీనియర్ సభ్యులు, ప్రస్తుత అధ్యక్షులు. అధ్యక్షుడిని నియమిస్తుంది, సస్పెన్షన్లు విధిస్తుంది, ఎన్నికలను ప్రారంభిస్తుంది.", hi: "सर्वोच्च सलाहकार समिति — संस्थापक, निष्ठावान वरिष्ठ सदस्य और वर्तमान अध्यक्ष। अध्यक्ष नियुक्त करती है, निलंबन जारी करती है और चुनाव सक्षम करती है।" }, lang)}
              </p>
            </div>
          </div>
        </Card>

        {!canManage && (
          <Card className="p-3 bg-amber-500/10 border-amber-500/40 text-xs">
            <AlertTriangle className="size-4 inline mr-1 text-amber-400" />
            You have view-only access. Only Org Admin or an active Disciplinary Committee member can manage this module.
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border flex-wrap">
          {([
            ["committee", "Committee · కమిటీ"],
            ["suspensions", "Suspensions · సస్పెన్షన్"],
            ["leadership", "Leadership · నాయకత్వం"],
            ["leave", "Leave Requests · వైదొలగే అభ్యర్థనలు"],
          ] as const).map(([k, label]) => {
            const pending = k === "leave" ? (leaveQ.data?.requests ?? []).filter((r: any) => r.status === "pending").length : 0;
            return (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === k ? "border-red-500 text-red-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
              {pending > 0 && <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">{pending}</span>}
            </button>
            );
          })}
        </div>

        {/* Committee tab */}
        {tab === "committee" && (
          <div className="space-y-3">
            {canManage && (
              <Card className="p-4 bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="size-4 text-red-400" />
                  <h2 className="font-semibold text-sm">Appoint Committee Member</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Select value={apMember} onValueChange={setApMember}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.member_code ? `(${m.member_code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={apRole} onValueChange={(v) => setApRole(parseDisciplinaryRole(v))}>
                    <SelectTrigger aria-label={localizeText({ en: "Committee role", te: "కమిటీ పదవి", hi: "समिति पद" }, lang)} data-notranslit><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISCIPLINARY_ROLES.map((role) => (
                        <SelectItem key={role} value={role} data-notranslit>{roleLabel(role)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Notes (optional)" value={apNotes} onChange={(e) => setApNotes(e.target.value)} />
                <Button onClick={onAppoint} className="bg-red-600 hover:bg-red-700 text-white">
                  <UserPlus className="size-4 mr-1" /> Appoint
                </Button>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {committee.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground col-span-full">
                  No committee members appointed yet.
                </Card>
              )}
              {committee.map((c: any) => (
                <Card key={c.id} className="p-3 bg-card flex items-center gap-3">
                  <div className="size-12 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {c.members?.photo_url
                      ? <img src={c.members.photo_url} className="size-full object-cover" alt={c.members.name ?? ""} />
                      : <ShieldAlert className="size-6 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.members?.name ?? "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground break-words" data-notranslit>
                      {c.members?.member_code ?? ""} · {roleLabel(c.role)}
                    </p>
                    {c.notes && <p className="text-[10px] text-muted-foreground truncate italic">{c.notes}</p>}
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Remove from committee?")) return;
                        try { await removeM({ data: { id: c.id } }); invalidate(); toast.success("Removed"); }
                        catch (e: any) { toast.error(e.message); }
                      }}
                    >
                      <Trash2 className="size-4 text-red-400" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Suspensions tab */}
        {tab === "suspensions" && (
          <div className="space-y-3">
            {canManage && (
              <Card className="p-4 bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Ban className="size-4 text-red-400" />
                  <h2 className="font-semibold text-sm">Issue Suspension Order</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Select value={sTarget} onValueChange={setSTarget}>
                    <SelectTrigger><SelectValue placeholder="Target member / executive" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.member_code ? `(${m.member_code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sCategory} onValueChange={(v: any) => setSCategory(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(catLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Reason · కారణం (required)" value={sReason} onChange={(e) => setSReason(e.target.value)} rows={2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground">Effective Until (optional)</label>
                    <DateInput value={sUntil} onChange={(e) => setSUntil(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground">Notes (optional)</label>
                    <Input value={sNotes} onChange={(e) => setSNotes(e.target.value)} />
                  </div>
                </div>
                <Button onClick={onIssue} className="bg-red-600 hover:bg-red-700 text-white">
                  <Ban className="size-4 mr-1" /> Issue Suspension
                </Button>
              </Card>
            )}

            <div className="space-y-2">
              {suspensions.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">No suspensions recorded.</Card>
              )}
              {suspensions.map((s: any) => (
                <Card key={s.id} className="p-3 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{s.members?.name ?? "Unknown"}</p>
                        <Badge className={
                          s.status === "active" ? "bg-red-500/20 text-red-300 border-red-500/40" :
                          s.status === "revoked" ? "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" :
                          "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }>{s.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{catLabel[s.category] ?? s.category}</Badge>
                      </div>
                      <p className="text-xs mt-1 whitespace-pre-wrap">{s.reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        From {new Date(s.effective_from).toLocaleDateString("en-GB")}
                        {s.effective_until ? ` → ${new Date(s.effective_until).toLocaleDateString("en-GB")}` : ""}
                      </p>
                    </div>
                    {canManage && s.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!confirm("Revoke this suspension?")) return;
                          try { await revoke({ data: { id: s.id } }); invalidate(); toast.success("Revoked"); }
                          catch (e: any) { toast.error(e.message); }
                        }}
                      >Revoke</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Leadership tab */}
        {tab === "leadership" && (
          <div className="space-y-3">
            <Card className="p-4 bg-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Vote className="size-4 text-amber-400" /> Election Mode · ఎన్నికల మోడ్
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    If the committee cannot reach consensus on a President, unlock Election Mode so members can vote.
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant={electionMode ? "destructive" : "default"}
                    onClick={async () => {
                      try {
                        await setElec({ data: { enabled: !electionMode } });
                        invalidate();
                        toast.success(electionMode ? "Election mode disabled" : "Election mode ENABLED");
                      } catch (e: any) { toast.error(e.message); }
                    }}
                  >
                    {electionMode ? "Disable" : "Unlock Election Mode"}
                  </Button>
                )}
              </div>
            </Card>

            {canManage && (
              <Card className="p-4 bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Gavel className="size-4 text-red-400" />
                  <h2 className="font-semibold text-sm">Nominate President Candidate</h2>
                </div>
                <Select value={nCandidate} onValueChange={setNCandidate}>
                  <SelectTrigger><SelectValue placeholder="Select candidate member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} {m.member_code ? `(${m.member_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notes / justification" value={nNotes} onChange={(e) => setNNotes(e.target.value)} rows={2} />
                <Button onClick={onNominate} className="bg-red-600 hover:bg-red-700 text-white">
                  <Gavel className="size-4 mr-1" /> Nominate
                </Button>
              </Card>
            )}

            <div className="space-y-2">
              {nominations.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">No nominations yet.</Card>
              )}
              {nominations.map((n: any) => (
                <Card key={n.id} className="p-3 bg-card">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {n.members?.photo_url
                        ? <img src={n.members.photo_url} className="size-full object-cover" alt="" />
                        : <Gavel className="size-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{n.members?.name ?? "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {n.members?.member_code ?? ""} · Status: <b>{n.status}</b> · For: {n.votes_for} · Against: {n.votes_against}
                      </p>
                      {n.notes && <p className="text-[10px] italic text-muted-foreground mt-1">{n.notes}</p>}
                    </div>
                    {canManage && n.status === "pending" && (
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline"
                          onClick={async () => { try { await vote({ data: { id: n.id, direction: "for" } }); invalidate(); } catch (e: any) { toast.error(e.message); } }}>
                          <ThumbsUp className="size-3 mr-1" /> For
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={async () => { try { await vote({ data: { id: n.id, direction: "against" } }); invalidate(); } catch (e: any) { toast.error(e.message); } }}>
                          <ThumbsDown className="size-3 mr-1" /> Against
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => { try { await decide({ data: { id: n.id, status: "approved" } }); invalidate(); toast.success("Approved"); } catch (e: any) { toast.error(e.message); } }}>
                          <CheckCircle2 className="size-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={async () => { try { await decide({ data: { id: n.id, status: "deadlocked" } }); invalidate(); toast.success("Marked deadlocked"); } catch (e: any) { toast.error(e.message); } }}>
                          <XCircle className="size-3 mr-1" /> Deadlock
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Leave Requests tab */}
        {tab === "leave" && (
          <div className="space-y-3">
            <Card className="p-3 bg-card text-xs text-muted-foreground">
              <DoorOpen className="size-4 inline mr-1 text-amber-400" />
              Members who wish to leave the society submit a reason here. Review each case carefully — a member with outstanding loans, pending responsibilities, or good conduct may be denied to protect the society.
              సభ్యుడు వైదొలగే ముందు అప్పులు / బాధ్యతలు తనిఖీ చేసి ఆమోదించండి లేదా తిరస్కరించండి.
            </Card>

            {(leaveQ.data?.requests ?? []).length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">No leave requests yet.</Card>
            )}

            {(leaveQ.data?.requests ?? []).map((r: any) => {
              const isPending = r.status === "pending";
              const notes = leaveNotes[r.id] ?? "";
              return (
                <Card key={r.id} className="p-4 bg-card space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {r.members?.photo_url
                        ? <img src={r.members.photo_url} className="size-full object-cover" alt="" />
                        : <DoorOpen className="size-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.members?.name ?? "Unknown"}</p>
                        {r.members?.member_code && <span className="text-[10px] text-muted-foreground">({r.members.member_code})</span>}
                        {isPending && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40"><Clock className="size-3 mr-1" />Pending</Badge>}
                        {r.status === "approved" && <Badge className="bg-green-500/20 text-green-300 border-green-500/40"><CheckCircle2 className="size-3 mr-1" />Approved · Removed</Badge>}
                        {r.status === "rejected" && <Badge className="bg-red-500/20 text-red-300 border-red-500/40"><XCircle className="size-3 mr-1" />Rejected</Badge>}
                      </div>
                      {(r.members?.phone || r.members?.email) && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {r.members?.phone ?? ""} {r.members?.email ? `· ${r.members.email}` : ""}
                        </p>
                      )}
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground text-xs">Reason / కారణం:</span><br />
                        {r.reason}
                      </p>
                      {r.review_notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Committee note: {r.review_notes}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Submitted: {new Date(r.created_at).toLocaleString()}
                        {r.reviewed_at && ` · Reviewed: ${new Date(r.reviewed_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {canManage && isPending && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <Textarea
                        placeholder="Optional review note (e.g. outstanding loan of Rs. 5,000 — please clear first)"
                        value={notes}
                        onChange={(e) => setLeaveNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => {
                            if (!confirm(`Approve leave for ${r.members?.name}? This will permanently remove the member.`)) return;
                            try {
                              await approveLeave({ data: { id: r.id, notes: notes || undefined } });
                              toast.success("Leave approved — member removed");
                              setLeaveNotes((s) => { const n = { ...s }; delete n[r.id]; return n; });
                              invalidateLeave();
                            } catch (e: any) { toast.error(e.message); }
                          }}
                        >
                          <CheckCircle2 className="size-3 mr-1" /> Approve & Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await rejectLeave({ data: { id: r.id, notes: notes || undefined } });
                              toast.success("Leave request rejected");
                              setLeaveNotes((s) => { const n = { ...s }; delete n[r.id]; return n; });
                              invalidateLeave();
                            } catch (e: any) { toast.error(e.message); }
                          }}
                        >
                          <XCircle className="size-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
