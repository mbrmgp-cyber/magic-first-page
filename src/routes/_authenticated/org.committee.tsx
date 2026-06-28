import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, Crown, Users, Settings, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  listCommittee, listEligibleMembers, appointCommitteeMember,
  updateCommitteeMember, removeCommitteeMember, updateTermYears,
  updateMemberSignature,
  type CommitteeRole,
} from "@/lib/committee.functions";
import { getMyOrg, updateOrgPresident } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type CM = {
  id: string;
  member_id: string;
  role: CommitteeRole;
  position_number: number;
  term_start_date: string;
  term_end_date: string;
  qualifications: string | null;
  responsibilities: string | null;
  members: { id: string; name: string; photo_url: string | null; email: string | null; phone: string | null; signature_url: string | null } | null;
};

const ROLE_LABELS: Record<CommitteeRole, string> = {
  president: "అధ్యక్షుడు",
  vice_president: "ఉపాధ్యక్షుడు",
  advisor: "గౌరవ సలహాదారు",
  treasurer: "కోశాధికారి",
  executive: "కార్యనిర్వాహకుడు",
  worker: "కార్యకర్త",
};

const ROLE_ORDER: CommitteeRole[] = [
  "president", "vice_president", "advisor", "treasurer", "executive", "worker",
];

const ROLE_GRADIENT: Record<CommitteeRole, string> = {
  president: "linear-gradient(135deg,#B85C00,#FF9933)",
  vice_president: "linear-gradient(135deg,#FF9933,#FFB366)",
  advisor: "linear-gradient(135deg,#6B4FBB,#9B7FE0)",
  treasurer: "linear-gradient(135deg,#0B7A0B,#5BC85B)",
  executive: "linear-gradient(135deg,#0B5C06,#138808)",
  worker: "linear-gradient(135deg,#1A6D8E,#4FB3D9)",
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("te-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

function MemberCard({
  cm, large = false, canManage, onEdit, onDelete, onView, isMe, onReload,
}: {
  cm: CM; large?: boolean; canManage: boolean;
  onEdit: () => void; onDelete: () => void; onView: () => void; isMe: boolean;
  onReload: () => void;
}) {
  const m = cm.members;
  const initials = (m?.name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const [imgBroken, setImgBroken] = useState(false);
  const showPhoto = !!m?.photo_url && !imgBroken;
  const sigInp = useRef<HTMLInputElement>(null);
  const [sigBusy, setSigBusy] = useState(false);
  const [sigUrl, setSigUrl] = useState<string | null>(m?.signature_url ?? null);
  const fnSig = useServerFn(updateMemberSignature);

  useEffect(() => { setSigUrl(m?.signature_url ?? null); }, [m?.signature_url]);

  async function onPickSig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !m) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("ఫైల్ 2MB మించరాదు"); return; }
    setSigBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/member-sig/${m.id}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("URL generation failed");
      await fnSig({ data: { member_id: m.id, signature_url: url } });
      setSigUrl(url);
      toast.success("సంతకం సేవ్ అయింది");
      onReload();
    } catch (err: any) { toast.error(err.message); }
    finally { setSigBusy(false); }
  }

  return (
    <Card
      className={`relative p-3 bg-white/95 border-white shadow-md hover:shadow-lg transition cursor-pointer ${large ? "p-5" : ""} ${isMe ? "ring-2 ring-amber-500" : ""}`}
      onClick={onView}
    >
      {canManage && (
        <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className={`flex ${large ? "flex-col items-center text-center" : "flex-row items-center"} gap-3`}>
        <div
          className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-bold ${large ? "w-24 h-24 text-2xl" : "w-14 h-14 text-base"}`}
          style={{ background: ROLE_GRADIENT[cm.role] }}
        >
          {showPhoto ? (
            <img
              src={m!.photo_url!}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={`min-w-0 ${large ? "" : "flex-1"}`}>
          <div className={`font-semibold leading-tight ${large ? "text-lg" : "text-sm"} truncate`}>{m?.name ?? "—"}</div>
          <Badge variant="secondary" className="mt-1 text-[10px]" style={{ background: ROLE_GRADIENT[cm.role], color: "white" }}>
            {ROLE_LABELS[cm.role]}
          </Badge>
          <div className="text-[10px] text-muted-foreground mt-1">
            {fmtDate(cm.term_start_date)} → {fmtDate(cm.term_end_date)}
          </div>
        </div>
      </div>

      {/* Per-member signature */}
      <div className="mt-3 pt-3 border-t border-muted/40" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">సంతకం</span>
          {canManage && (
            <>
              <input ref={sigInp} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPickSig} />
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={sigBusy} onClick={() => sigInp.current?.click()}>
                <Camera className="w-3 h-3 mr-1" /> {sigUrl ? "మార్చండి" : "అప్‌లోడ్"}
              </Button>
            </>
          )}
        </div>
        <div className="mt-2 h-12 w-full rounded-md border bg-white flex items-center justify-center overflow-hidden">
          {sigUrl ? (
            <img src={sigUrl} alt="signature" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">సంతకం లేదు</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function CommitteePage() {
  const fnList = useServerFn(listCommittee);
  const fnMembers = useServerFn(listEligibleMembers);
  const fnAppoint = useServerFn(appointCommitteeMember);
  const fnUpdate = useServerFn(updateCommitteeMember);
  const fnRemove = useServerFn(removeCommitteeMember);
  const fnTerm = useServerFn(updateTermYears);

  const [data, setData] = useState<{ committee: CM[]; canManage: boolean; termYears: number; myRole: CommitteeRole | null; orgId: string | null }>({
    committee: [], canManage: false, termYears: 2, myRole: null, orgId: null,
  });
  const [loading, setLoading] = useState(true);
  const [eligibleMembers, setEligibleMembers] = useState<Array<{ id: string; name: string; photo_url: string | null }>>([]);

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState<CommitteeRole>("worker");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [qual, setQual] = useState("");
  const [resp, setResp] = useState("");

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [termYearsInput, setTermYearsInput] = useState(2);

  // View dialog
  const [viewing, setViewing] = useState<CM | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList();
      setData({
        committee: r.committee as CM[],
        canManage: r.canManage,
        termYears: r.termYears,
        myRole: r.myRole,
        orgId: r.orgId,
      });
      setTermYearsInput(r.termYears);
      if (r.canManage) {
        const em = await fnMembers();
        setEligibleMembers(em.members);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<CommitteeRole, CM[]> = {
      president: [], vice_president: [], advisor: [], treasurer: [], executive: [], worker: [],
    };
    data.committee.forEach(c => g[c.role].push(c));
    return g;
  }, [data.committee]);

  const resetForm = () => {
    setEditId(null); setMemberId(""); setRole("worker"); setQual(""); setResp("");
    const today = new Date();
    setTermStart(today.toISOString().slice(0, 10));
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + (data.termYears || 2));
    setTermEnd(end.toISOString().slice(0, 10));
  };

  const openAdd = () => { resetForm(); setFormOpen(true); };
  const openEdit = (cm: CM) => {
    setEditId(cm.id); setMemberId(cm.member_id); setRole(cm.role);
    setTermStart(cm.term_start_date); setTermEnd(cm.term_end_date);
    setQual(cm.qualifications ?? ""); setResp(cm.responsibilities ?? "");
    setFormOpen(true);
  };

  const save = async () => {
    if (!editId && !memberId) { toast.error("సభ్యునిని ఎంచుకోండి"); return; }
    if (!termStart || !termEnd) { toast.error("పదవీకాల తేదీలు అవసరం"); return; }
    try {
      if (editId) {
        await fnUpdate({ data: { id: editId, role, term_start_date: termStart, term_end_date: termEnd, qualifications: qual, responsibilities: resp } });
        toast.success("నవీకరించబడింది");
      } else {
        await fnAppoint({ data: { member_id: memberId, role, term_start_date: termStart, term_end_date: termEnd, qualifications: qual, responsibilities: resp } });
        toast.success("నియమించబడ్డారు");
      }
      setFormOpen(false); await load();
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    }
  };

  const handleDelete = async (cm: CM) => {
    if (!confirm(`${cm.members?.name} గారిని కార్యవర్గం నుండి తొలగించాలా?`)) return;
    try { await fnRemove({ data: { id: cm.id } }); await load(); toast.success("తొలగించబడ్డారు"); }
    catch (e: any) { toast.error(e.message); }
  };

  const saveTermYears = async () => {
    try { await fnTerm({ data: { years: termYearsInput } }); toast.success("పదవీకాలం నవీకరించబడింది"); setSettingsOpen(false); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const totalCount = data.committee.length;
  const presidentRow = grouped.president[0];

  // Already-appointed member IDs (for new-appointment dropdown)
  const appointedIds = new Set(data.committee.map(c => c.member_id));
  const selectableMembers = eligibleMembers.filter(m => editId || !appointedIds.has(m.id));

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back / వెనుకకు
        </button>

        {/* Compact title row */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-foreground">
            <Crown className="w-5 h-5 text-amber-500" /> మా కార్యవర్గం
            <span className="text-xs font-normal text-muted-foreground">
              ({totalCount} మంది · {data.termYears} సం.)
            </span>
          </h1>
          {data.canManage && (
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)} className="shrink-0">
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>

        {data.canManage && (
          <Button onClick={openAdd} className="w-full" style={{ background: "linear-gradient(90deg,#B85C00,#0B5C06)" }}>
            <Plus className="w-4 h-4 mr-1" /> సభ్యునిని నియమించండి
          </Button>
        )}


        {loading ? (
          <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">లోడ్ అవుతోంది...</Card>
        ) : totalCount === 0 ? (
          <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">
            <Crown className="w-10 h-10 mx-auto mb-2 text-amber-400" />
            <p>ఇంకా కార్యవర్గం నియమించలేదు.</p>
            {data.canManage && <p className="text-xs mt-2">పైన "సభ్యునిని నియమించండి" నొక్కండి.</p>}
          </Card>
        ) : (
          <div className="space-y-5">
            {/* President - large centered */}
            {presidentRow && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground/80">అధ్యక్షుడు</h3>
                <div className="max-w-xs mx-auto">
                  <MemberCard
                    cm={presidentRow}
                    large
                    canManage={data.canManage}
                    onEdit={() => openEdit(presidentRow)}
                    onDelete={() => handleDelete(presidentRow)}
                    onView={() => setViewing(presidentRow)}
                    isMe={data.myRole === "president"}
                    onReload={load}
                  />
                </div>
              </div>
            )}

            {/* Other roles */}
            {ROLE_ORDER.slice(1).map(r => grouped[r].length > 0 && (
              <div key={r}>
                <h3 className="text-sm font-semibold mb-2 text-foreground/80">
                  {ROLE_LABELS[r]} ({grouped[r].length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped[r].map(cm => (
                    <MemberCard
                      key={cm.id}
                      cm={cm}
                      canManage={data.canManage}
                      onEdit={() => openEdit(cm)}
                      onDelete={() => handleDelete(cm)}
                      onView={() => setViewing(cm)}
                      isMe={false}
                      onReload={load}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appoint/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "వివరాలు మార్చండి" : "కార్యవర్గ సభ్యుని నియమించండి"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editId && (
              <div>
                <label className="text-xs font-medium">సభ్యుడు</label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger><SelectValue placeholder="సభ్యునిని ఎంచుకోండి" /></SelectTrigger>
                  <SelectContent>
                    {selectableMembers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">అందుబాటులో సభ్యులు లేరు</div>
                    ) : selectableMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium">పదవి</label>
              <Select value={role} onValueChange={v => setRole(v as CommitteeRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">పదవీకాలం ప్రారంభం</label>
                <Input type="date" value={termStart} onChange={e => setTermStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">పదవీకాలం ముగింపు</label>
                <Input type="date" value={termEnd} onChange={e => setTermEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">అర్హతలు (ఐచ్ఛికం)</label>
              <Textarea rows={2} value={qual} onChange={e => setQual(e.target.value)} placeholder="ఉదా: B.A, 10 సం. సామాజిక సేవ" />
            </div>
            <div>
              <label className="text-xs font-medium">బాధ్యతలు (ఐచ్ఛికం)</label>
              <Textarea rows={3} value={resp} onChange={e => setResp(e.target.value)} placeholder="ఈ పదవి బాధ్యతలు రాయండి..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} className="flex-1"><Check className="w-4 h-4 mr-1" />సేవ్ చేయండి</Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>పదవీకాలం settings</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">డిఫాల్ట్ పదవీకాలం (సంవత్సరాలు)</label>
              <Input type="number" min={1} max={10} value={termYearsInput} onChange={e => setTermYearsInput(Number(e.target.value))} />
              <p className="text-[11px] text-muted-foreground mt-1">కొత్త నియామకాలకు ఇది వర్తిస్తుంది.</p>
            </div>
            <Button onClick={saveTermYears} className="w-full">సేవ్ చేయండి</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View details dialog */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.members?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0"
                    style={{ background: ROLE_GRADIENT[viewing.role] }}>
                    {viewing.members?.photo_url
                      ? <img src={viewing.members.photo_url} alt="" className="w-full h-full object-cover" />
                      : (viewing.members?.name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Badge style={{ background: ROLE_GRADIENT[viewing.role], color: "white" }}>
                      {ROLE_LABELS[viewing.role]}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-2">
                      పదవీకాలం: {fmtDate(viewing.term_start_date)} → {fmtDate(viewing.term_end_date)}
                    </div>
                    {viewing.members?.phone && <div className="text-xs mt-1">📞 {viewing.members.phone}</div>}
                    {viewing.members?.email && <div className="text-xs truncate">✉ {viewing.members.email}</div>}
                  </div>
                </div>
                {viewing.qualifications && (
                  <div>
                    <div className="text-xs font-semibold text-foreground/70 mb-1">అర్హతలు</div>
                    <p className="text-sm whitespace-pre-wrap">{viewing.qualifications}</p>
                  </div>
                )}
                {viewing.responsibilities && (
                  <div>
                    <div className="text-xs font-semibold text-foreground/70 mb-1">బాధ్యతలు</div>
                    <p className="text-sm whitespace-pre-wrap">{viewing.responsibilities}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/org/committee")({
  head: () => ({ meta: [{ title: "కార్యవర్గం" }] }),
  component: CommitteePage,
});

function PresidentSignatureSection() {
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const save = useServerFn(updateOrgPresident);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const org = orgQ.data?.org as any;
  const [name, setName] = useState<string>("");
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (org && !hydrated) {
      setName(org.president_name ?? "");
      setSigUrl(org.president_signature_url ?? null);
      setHydrated(true);
    }
  }, [org, hydrated]);

  if (!org) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("ఫైల్ 2MB మించరాదు"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/president-sig/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("URL generation failed");
      await save({ data: { president_signature_url: url } });
      setSigUrl(url);
      qc.invalidateQueries({ queryKey: ["my-org"] });
      toast.success("సంతకం అప్‌లోడ్ అయింది");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function saveName() {
    if (name === (org.president_name ?? "")) return;
    setBusy(true);
    try {
      await save({ data: { president_name: name || null } });
      qc.invalidateQueries({ queryKey: ["my-org"] });
      toast.success("ప్రెసిడెంట్ పేరు సేవ్ అయింది");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="p-4 bg-white/95 backdrop-blur-xl shadow-xl border-white">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-semibold">అధ్యక్షుని పేరు & సంతకం (ID కార్డ్‌లో చూపబడుతుంది)</h3>
      </div>
      <input ref={inp} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPick} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">ప్రెసిడెంట్ పేరు</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            placeholder="ఉదా: M. భాస్కర్ రెడ్డి"
            className="mt-1"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="h-12 w-28 rounded-md border bg-white flex items-center justify-center overflow-hidden">
            {sigUrl ? (
              <img src={sigUrl} alt="signature" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[10px] text-muted-foreground">సంతకం</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => inp.current?.click()} disabled={busy}>
            <Camera className="w-4 h-4 mr-1" /> {sigUrl ? "మార్చండి" : "అప్‌లోడ్"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
