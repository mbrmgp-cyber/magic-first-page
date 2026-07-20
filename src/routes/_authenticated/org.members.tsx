import { DateInput } from "@/components/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionShell } from "@/components/SectionShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { reviewMember } from "@/lib/org.functions";
import { setMemberBehaviorStatus } from "@/lib/disciplinary.functions";
import {
  listOrgMembersFull, updateMemberProfile,
  listMemberLoans, listLoanPayments,
  addMemberLoan, addLoanPayment, closeLoan, deleteLoan,
  adminAddMember, adminDeleteMember, listApprovedMembers, setMemberActive,
  orgUpdateMemberCode,
} from "@/lib/members.functions";

import { Switch } from "@/components/ui/switch";
import { User, Plus, IndianRupee, CheckCircle2, XCircle, Trash2, Lock, UserPlus, Camera, Pencil, FileDown, Search } from "lucide-react";
import { downloadMemberListPdf } from "@/lib/member-list-pdf";
import { DonorsPanel } from "@/components/DonorsPanel";
import { useCurrency } from "@/lib/currency-context";



export const Route = createFileRoute("/_authenticated/org/members")({
  head: () => ({ meta: [{ title: "సభ్యుల వివరాలు" }] }),
  component: MembersPage,
});

type Member = any;
type Loan = any;

function MembersPage() {
  const list = useServerFn(listOrgMembersFull);
  const review = useServerFn(reviewMember);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r: any = await list();
      setMembers(r.members);
      setOrgId(r.orgId);
      setOrg(r.org ?? null);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const base = filter === "all"
      ? members.filter((m) => m.status !== "rejected")
      : members.filter((m) => m.status === filter);
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? base.filter((m) =>
          (m.member_code ?? "").toLowerCase().includes(q) ||
          (m.name ?? "").toLowerCase().includes(q)
        )
      : base;
    const codeNum = (c: string | null | undefined) => {
      if (!c) return Number.MAX_SAFE_INTEGER;
      const n = parseInt(String(c).replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    };
    return [...searched].sort((a, b) => {
      const d = codeNum(a.member_code) - codeNum(b.member_code);
      if (d !== 0) return d;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [members, filter, searchQuery]);

  async function onReview(id: string, action: "approve" | "reject") {
    try {
      await review({ data: { member_id: id, action } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function downloadMembersPdf() {
    if (filtered.length === 0) return;
    setPdfBusy(true);
    try {
      await downloadMemberListPdf({
        orgName: org?.name ?? "సొసైటీ",
        logoUrl: org?.logo_url ?? null,
        members: filtered,
      });
      toast.success("PDF డౌన్‌లోడ్ సిద్ధమైంది");
    } catch (e) {
      console.error(e);
      toast.error("PDF తయారు చేయలేకపోయాం");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <SectionShell title="సభ్యుల వివరాలు">
      {/* Smart Search Bar — visible across all tabs */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ID, Name or Donor..."
          className="pl-10 bg-primary text-primary-foreground placeholder:text-primary-foreground/60 border-primary-foreground/20 focus-visible:ring-yellow-400"
        />
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="members">సభ్యులు</TabsTrigger>
          <TabsTrigger value="donors">డోనర్స్</TabsTrigger>
          <TabsTrigger value="recognition">గుర్తింపు</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3 pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
                  {s === "all" ? "అందరూ" : s === "pending" ? "Pending" : s === "approved" ? "Approved" : "Rejected"}
                  <Badge variant="secondary" className="ml-2">
                    {s === "all"
                      ? members.filter((m) => m.status !== "rejected").length
                      : members.filter((m) => m.status === s).length}
                  </Badge>
                </Button>
              ))}
            </div>
            {orgId && <AddMemberDialog orgId={orgId} onAdded={refresh} />}
            {filtered.length > 0 && (
              <Button size="sm" variant="outline" disabled={pdfBusy} onClick={downloadMembersPdf}>
                <FileDown className="w-4 h-4 mr-1" /> {pdfBusy ? "PDF తయారవుతోంది…" : "PDF డౌన్‌లోడ్"}
              </Button>
            )}
          </div>

          {loading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">సభ్యులు లేరు</Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <MemberCard key={m.id} member={m} orgId={orgId!} org={org} onReview={onReview} onChange={refresh} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="donors" className="pt-3">
          <DonorsPanel searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="recognition" className="pt-3">
          <DonorsPanel recognitionOnly searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </SectionShell>
  );
}

function MemberCard({ member, orgId, org, onReview, onChange }:
  { member: Member; orgId: string; org: any; onReview: (id: string, a: "approve" | "reject") => void; onChange: () => void }) {
  const { symbol } = useCurrency();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!member.photo_url) return;
    let revoked = false;
    (async () => {
      const { data } = await supabase.storage.from("member-photos")
        .createSignedUrl(member.photo_url, 3600);
      if (!revoked && data?.signedUrl) setPhotoUrl(data.signedUrl);
    })();
    return () => { revoked = true; };
  }, [member.photo_url]);

  const statusColor =
    member.status === "approved" ? "bg-emerald-100 text-emerald-700" :
    member.status === "rejected" ? "bg-rose-100 text-rose-700" :
    "bg-amber-100 text-amber-700";

  return (
    <Card className="p-4 bg-white/95">
      <div className="flex gap-3 items-start">
        <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={member.name}
              className="h-full w-full object-cover"
              onError={() => setPhotoUrl(null)}
            />
          ) : (
            <User className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {member.member_code && (
              <span className="text-base font-mono font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-md shadow-sm">
                {member.member_code}
              </span>
            )}
            <h3 className="font-semibold truncate">{member.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{member.status}</span>
            {member.status === "approved" && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${member.is_active === false ? "bg-gray-200 text-gray-600" : "bg-emerald-100 text-emerald-700"}`}>
                {member.is_active === false ? "● Inactive" : "● Active"}
              </span>
            )}
          </div>


          {member.father_name && <p className="text-xs text-muted-foreground">తండ్రి: {member.father_name}</p>}
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          {member.phone && <p className="text-xs text-muted-foreground">📞 {member.phone}</p>}
          {member.address && <p className="text-xs text-muted-foreground line-clamp-2">📍 {member.address}</p>}
          {member.joined_date && (
            <p className="text-xs text-muted-foreground">చేరిన తేదీ: {new Date(member.joined_date).toLocaleDateString("te-IN")}</p>
          )}
          {member.introducer && (
            <p className="text-xs text-muted-foreground">పరిచయం: {member.introducer.name}</p>
          )}
          {Number(member.committee_fee_paid) > 0 && (
            <p className="text-xs">కమిటీ Fee: {symbol}{Number(member.committee_fee_paid).toFixed(2)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {member.status === "pending" && (
          <>
            <Button size="sm" onClick={() => onReview(member.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReview(member.id, "reject")}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </>
        )}
        {member.status === "approved" && (
          <>
            <EditMemberDialog member={member} onChange={onChange} />
            <MemberDetailsDialog member={member} orgId={orgId} onChange={onChange} />
          </>
        )}
        <DeleteMemberButton member={member} onChange={onChange} />
      </div>
    </Card>
  );
}

function DeleteMemberButton({ member, onChange }: { member: Member; onChange: () => void }) {
  const del = useServerFn(adminDeleteMember);
  const [busy, setBusy] = useState(false);
  async function confirmDelete() {
    setBusy(true);
    try {
      await del({ data: { member_id: member.id } });
      toast.success("సభ్యుడు తొలగించబడ్డారు");
      onChange();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" className="bg-rose-600 hover:bg-rose-700">
          <Trash2 className="w-4 h-4 mr-1" /> డిలీట్
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this member?</AlertDialogTitle>
          <AlertDialogDescription>
            {member.name} — ఈ చర్య శాశ్వతంగా రికార్డును తొలగిస్తుంది.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function AddMemberDialog({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const add = useServerFn(adminAddMember);
  const upd = useServerFn(updateMemberProfile);
  const { symbol } = useCurrency();
  const listAppr = useServerFn(listApprovedMembers);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [introducers, setIntroducers] = useState<{ id: string; name: string }[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const initial = {
    name: "", email: "", phone: "", father_name: "", address: "",
    joined_date: today, introducer_member_id: "", committee_fee_paid: "0",
    introduced_by_name: "", introducer_id: "",
    is_active: true,
  };
  const [f, setF] = useState(initial);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    listAppr().then((r) => setIntroducers(r.members ?? [])).catch(() => {});
  }, [open]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
    setReceiptFile(file);
  }

  async function submit() {
    if (!f.name.trim() || !f.email.trim()) { toast.error("పేరు మరియు Email ఇవ్వండి"); return; }
    setSaving(true);
    try {
      const r = await add({
        data: {
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone || null,
          father_name: f.father_name || null,
          address: f.address || null,
          joined_date: f.joined_date || null,
          introducer_member_id: f.introducer_member_id || null,
          introduced_by_name: f.introduced_by_name || null,
          introducer_id: f.introducer_id || null,
          committee_fee_paid: Number(f.committee_fee_paid || 0),
          is_active: f.is_active,
          status: "approved",
        },
      });
      // Upload photo if picked
      if (photoFile && r.id && r.orgId) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `admin/${r.orgId}/${r.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("member-photos")
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) toast.error("ఫోటో అప్‌లోడ్ విఫలమైంది: " + upErr.message);
        else await upd({ data: { member_id: r.id, photo_url: path, send_login_link: false } });
      }
      // Upload receipt if picked
      if (receiptFile && r.id && r.orgId) {
        const ext = receiptFile.name.split(".").pop() || "bin";
        const path = `admin/${r.orgId}/${r.id}/receipt-${Date.now()}.${ext}`;
        const { error: rErr } = await supabase.storage.from("member-receipts")
          .upload(path, receiptFile, { upsert: true, contentType: receiptFile.type });
        if (rErr) toast.error("రసీదు అప్‌లోడ్ విఫలమైంది: " + rErr.message);
        else await upd({ data: { member_id: r.id, membership_receipt_url: path, send_login_link: false } });
      }
      toast.success((r as any)?.emailSent ? "సభ్యుడు చేర్చబడ్డారు · లాగిన్ లింక్ ఈమెయిల్‌కు పంపబడింది" : "సభ్యుడు చేర్చబడ్డారు");
      if ((r as any)?.emailError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + (r as any).emailError);
      setOpen(false);
      setF(initial);
      setPhotoFile(null); setPhotoPreview(null);
      setReceiptFile(null);
      onAdded();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <UserPlus className="w-4 h-4 mr-1" /> సభ్యుడిని చేర్చు
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>కొత్త సభ్యుడు</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
              {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" />
                : <User className="w-8 h-8 text-muted-foreground" />}
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border cursor-pointer hover:bg-accent">
              <Camera className="w-4 h-4" /> ఫోటో ఎంచుకోండి
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
          </div>
          <div><Label>పూర్తి పేరు *</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>తండ్రి పేరు</Label>
            <Input value={f.father_name} onChange={(e) => setF({ ...f, father_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email *</Label>
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div><Label>అడ్రస్</Label>
            <Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>చేరిన తేదీ</Label>
              <DateInput value={f.joined_date} onChange={(e) => setF({ ...f, joined_date: e.target.value })} /></div>
            <div><Label>కమిటీ Fee {symbol}</Label>
              <Input type="number" step="0.01" value={f.committee_fee_paid}
                onChange={(e) => setF({ ...f, committee_fee_paid: e.target.value })} /></div>
          </div>
          <div>
            <Label className="text-sm">Upload Membership Fee Receipt · సభ్యత్వం ఫీజు రసీదు అప్లోడ్ <span className="text-xs text-muted-foreground">(Optional · ₹5,000)</span></Label>
            <Input type="file" accept="image/*,application/pdf" onChange={onPickReceipt} />
            {receiptFile && <p className="text-xs text-emerald-700 mt-1">✓ {receiptFile.name}</p>}
          </div>
          <div>
            <Label>పరిచయం చేసిన సభ్యుడు</Label>
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={f.introducer_member_id}
              onChange={(e) => setF({ ...f, introducer_member_id: e.target.value })}>
              <option value="">— ఎవరూ లేరు —</option>
              {introducers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <Label className="text-sm font-semibold">Reference Details · పరిచయస్తుడి వివరాలు</Label>
            <div><Label className="text-xs">Introduced By Name · పరిచయస్తుడు పేరు</Label>
              <Input value={f.introduced_by_name}
                onChange={(e) => setF({ ...f, introduced_by_name: e.target.value })} /></div>
            <div><Label className="text-xs">Introducer ID · పరిచయం చేసిన వారి ఐడి నంబర్</Label>
              <Input value={f.introducer_id}
                onChange={(e) => setF({ ...f, introducer_id: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">సభ్యత్వం యాక్టివ్</Label>
              <p className="text-xs text-muted-foreground">ఇనాక్టివ్ చేస్తే సదుపాయాలు పనిచేయవు</p>
            </div>
            <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "చేర్చుతోంది…" : "చేర్చు"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function MemberDetailsDialog({ member, orgId, onChange }:
  { member: Member; orgId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><IndianRupee className="w-4 h-4 mr-1" /> వివరాలు & Loans</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{member.name}</DialogTitle></DialogHeader>
        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
            <TabsTrigger value="loans" className="flex-1">Loans / Interest</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ProfileEdit member={member} onSaved={() => { onChange(); }} />
          </TabsContent>
          <TabsContent value="loans">
            <LoansPanel member={member} orgId={orgId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({ member, onChange }: { member: Member; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700">
          <Pencil className="w-4 h-4 mr-1" /> మార్చండి
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{member.name} — వివరాలు సరిచేయండి</DialogTitle></DialogHeader>
        <ProfileEdit member={member} onSaved={() => { onChange(); setOpen(false); }} />
      </DialogContent>
    </Dialog>
  );
}

function ProfileEdit({ member, onSaved }: { member: Member; onSaved: () => void }) {
  const upd = useServerFn(updateMemberProfile);
  const toggleActive = useServerFn(setMemberActive);
  const { symbol } = useCurrency();
  const [f, setF] = useState({
    name: member.name ?? "",
    father_name: member.father_name ?? "",
    address: member.address ?? "",
    phone: member.phone ?? "",
    joined_date: member.joined_date ?? "",
    committee_fee_paid: String(member.committee_fee_paid ?? 0),
    blood_group: (member as any).blood_group ?? "",
    introduced_by_name: (member as any).introduced_by_name ?? "",
    introducer_id: (member as any).introducer_id ?? "",
  });
  const [active, setActive] = useState<boolean>(member.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    const p = (member as any).membership_receipt_url as string | null | undefined;
    if (!p) return;
    let cancelled = false;
    supabase.storage.from("member-receipts").createSignedUrl(p, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setReceiptUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [(member as any).membership_receipt_url]);

  useEffect(() => {
    if (!member.photo_url) return;
    let cancelled = false;
    supabase.storage.from("member-photos")
      .createSignedUrl(member.photo_url, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setCurrentPhotoUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [member.photo_url]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save() {
    setSaving(true);
    try {
      let photo_url: string | undefined;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `admin/${member.org_id}/${member.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("member-photos")
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) throw new Error("ఫోటో అప్‌లోడ్ విఫలం: " + upErr.message);
        photo_url = path;
      }
      let membership_receipt_url: string | undefined;
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop() || "bin";
        const path = `admin/${member.org_id}/${member.id}/receipt-${Date.now()}.${ext}`;
        const { error: rErr } = await supabase.storage.from("member-receipts")
          .upload(path, receiptFile, { upsert: true, contentType: receiptFile.type });
        if (rErr) throw new Error("రసీదు అప్‌లోడ్ విఫలం: " + rErr.message);
        membership_receipt_url = path;
      }
      const r: any = await upd({
        data: {
          member_id: member.id,
          name: f.name?.trim() || member.name,
          father_name: f.father_name || null,
          address: f.address || null,
          phone: f.phone || null,
          joined_date: f.joined_date || null,
          committee_fee_paid: Number(f.committee_fee_paid || 0),
          blood_group: f.blood_group || null,
          introduced_by_name: f.introduced_by_name || null,
          introducer_id: f.introducer_id || null,
          is_active: active,
          ...(photo_url ? { photo_url } : {}),
          ...(membership_receipt_url ? { membership_receipt_url } : {}),
        },
      });
      toast.success(r?.emailSent ? "Saved · లాగిన్ లింక్ ఈమెయిల్‌కు పంపబడింది" : "Saved");
      if (r?.emailError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.emailError);
      setPhotoFile(null); setPhotoPreview(null);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function quickToggle(v: boolean) {
    setActive(v);
    try {
      const r: any = await toggleActive({ data: { member_id: member.id, is_active: v } });
      toast.success(r?.emailSent ? `${v ? "యాక్టివ్ చేయబడింది" : "ఇనాక్టివ్ చేయబడింది"} · లాగిన్ లింక్ పంపబడింది` : (v ? "యాక్టివ్ చేయబడింది" : "ఇనాక్టివ్ చేయబడింది"));
      if (r?.emailError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.emailError);
      onSaved();
    } catch (e: any) { toast.error(e.message); setActive(!v); }
  }

  const shownPhoto = photoPreview ?? currentPhotoUrl;

  return (
    <div className="space-y-3 pt-3">
      {member.member_code && (
        <MemberCodeEditor member={member} onSaved={onSaved} />
      )}
      <div className="flex items-center gap-3">

        <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
          {shownPhoto ? <img src={shownPhoto} className="h-full w-full object-cover" />
            : <User className="w-8 h-8 text-muted-foreground" />}
        </div>
        <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border cursor-pointer hover:bg-accent">
          <Camera className="w-4 h-4" /> ఫోటో మార్చండి
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </label>
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label className="text-sm">సభ్యత్వం యాక్టివ్</Label>
          <p className="text-xs text-muted-foreground">
            ప్రస్తుత స్థితి: <span className={active ? "text-emerald-600 font-medium" : "text-gray-500 font-medium"}>
              {active ? "● Active" : "● Inactive"}
            </span>
          </p>
        </div>
        <Switch checked={active} onCheckedChange={quickToggle} />
      </div>
      <div><Label>పేరు</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>తండ్రి పేరు</Label><Input value={f.father_name} onChange={(e) => setF({ ...f, father_name: e.target.value })} /></div>
      <div><Label>అడ్రస్</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div>
          <Label>చేరిన తేదీ</Label>
          <JoinedDateInput value={f.joined_date ?? ""} onChange={(v) => setF({ ...f, joined_date: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>బ్లడ్ గ్రూప్</Label>
          <Input placeholder="A+ / B+ / O+ ..." value={f.blood_group} onChange={(e) => setF({ ...f, blood_group: e.target.value })} /></div>
        <div><Label>కమిటీ Fee ({symbol})</Label>
          <Input type="number" step="0.01" value={f.committee_fee_paid} onChange={(e) => setF({ ...f, committee_fee_paid: e.target.value })} /></div>
      </div>
      <div className="rounded-md border p-3 space-y-2">
        <Label className="text-sm font-semibold">Reference Details · పరిచయస్తుడి వివరాలు</Label>
        <div><Label className="text-xs">Introduced By Name · పరిచయస్తుడు పేరు</Label>
          <Input value={f.introduced_by_name}
            onChange={(e) => setF({ ...f, introduced_by_name: e.target.value })} /></div>
        <div><Label className="text-xs">Introducer ID · పరిచయం చేసిన వారి ఐడి నంబర్</Label>
          <Input value={f.introducer_id}
            onChange={(e) => setF({ ...f, introducer_id: e.target.value })} /></div>
      </div>
      <div className="rounded-md border p-3 space-y-2">
        <Label className="text-sm font-semibold">Upload Membership Fee Receipt · సభ్యత్వం ఫీజు రసీదు అప్లోడ్</Label>
        <p className="text-xs text-muted-foreground">Optional · ₹5,000 receipt (image or PDF)</p>
        <Input type="file" accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
            setReceiptFile(file);
          }} />
        {receiptFile && <p className="text-xs text-emerald-700">✓ {receiptFile.name}</p>}
        {!receiptFile && receiptUrl && (
          <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View current receipt</a>
        )}
      </div>
      <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}

function MemberCodeEditor({ member, onSaved }: { member: Member; onSaved: () => void }) {
  const update = useServerFn(orgUpdateMemberCode);
  const locked = !!member.member_code_locked;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<string>(member.member_code ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = val.trim();
    if (!v || v === member.member_code) { setEditing(false); return; }
    setSaving(true);
    try {
      const r: any = await update({ data: { member_id: member.id, new_code: v } });
      toast.success(r?.emailSent ? "ఐడి అప్‌డేట్ అయింది & లాగిన్ లింక్ పంపబడింది" : "ఐడి అప్‌డేట్ అయింది & లాక్ చేయబడింది");
      if (r?.emailError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.emailError);
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  if (locked) {
    return (
      <div className="rounded-md border bg-primary/5 p-3 flex items-center justify-between">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> ఐడి నెంబర్ (లాక్ అయింది)</Label>
          <p className="font-mono text-lg font-semibold text-primary">{member.member_code}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-amber-50 border-amber-300 p-3 space-y-2">
      <Label className="text-xs text-amber-800">
        ఐడి నెంబర్ — ఇప్పుడు ఒకసారి మార్చవచ్చు. Save చేస్తే లాక్ అవుతుంది.
      </Label>
      {editing ? (
        <div className="flex gap-2">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value.toUpperCase())}
            className="font-mono"
            autoFocus
          />
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "Save & Lock"}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setVal(member.member_code ?? ""); setEditing(false); }}>రద్దు</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="font-mono text-lg font-semibold text-primary">{member.member_code}</p>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit ID</Button>
        </div>
      )}
    </div>
  );
}

function JoinedDateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toDisplay = (iso: string) => {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
  };
  const parseDisplay = (s: string): string | null => {
    const t = s.trim();
    if (!t) return "";
    let m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
    if (m) {
      const d = m[1].padStart(2, "0"), mo = m[2].padStart(2, "0"), y = m[3];
      return `${y}-${mo}-${d}`;
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) return t;
    return null;
  };
  const [text, setText] = useState(toDisplay(value));
  useEffect(() => { setText(toDisplay(value)); }, [value]);
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        inputMode="numeric"
        placeholder="DD-MM-YYYY"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const iso = parseDisplay(e.target.value);
          if (iso !== null) onChange(iso);
        }}
        onBlur={() => {
          const iso = parseDisplay(text);
          if (iso === null) {
            toast.error("తేదీ format: DD-MM-YYYY");
            setText(toDisplay(value));
          }
        }}
        className="flex-1"
      />
    </div>
  );
}






type LoanFxCode = "INR" | "USD" | "AED" | "KWD" | "MYR";

async function fetchLoanFx(code: LoanFxCode): Promise<number | null> {
  if (code === "INR") return 1;
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${code}`);
    const j = await r.json();
    const inr = j?.rates?.INR;
    return typeof inr === "number" && inr > 0 ? Math.round(inr * 100) / 100 : null;
  } catch { return null; }
}

function LoansPanel({ member, orgId }: { member: Member; orgId: string }) {
  const listL = useServerFn(listMemberLoans);
  const addL = useServerFn(addMemberLoan);
  const closeL = useServerFn(closeLoan);
  const delL = useServerFn(deleteLoan);
  const { symbol } = useCurrency();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [suspensions, setSuspensions] = useState<Array<{ category: string | null; status: string | null; effective_until: string | null; reason?: string | null }>>([]);
  const [nf, setNf] = useState({
    principal: "", interest_rate_monthly: "1.5",
    start_date: new Date().toISOString().slice(0, 10), purpose: "",
    surety_name: "", surety_id: "",
    ccy: "INR" as LoanFxCode, fxRate: "", fxAmt: "",
  });

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("disciplinary_suspensions")
        .select("category,status,effective_until,reason")
        .eq("target_member_id", member.id);
      if (!cancel) setSuspensions((data as any) ?? []);
    })();
    return () => { cancel = true; };
  }, [member.id]);

  useEffect(() => {
    if (nf.ccy === "INR") { setNf((s) => ({ ...s, fxRate: "" })); return; }
    let cancel = false;
    fetchLoanFx(nf.ccy).then((v) => { if (!cancel && v) setNf((s) => ({ ...s, fxRate: String(v) })); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nf.ccy]);

  useEffect(() => {
    if (nf.ccy === "INR") return;
    const r = Number(nf.fxRate || 0);
    if (!(r > 0)) return;
    if (nf.fxAmt) setNf((s) => ({ ...s, principal: String(Math.round(Number(nf.fxAmt) * r * 100) / 100) }));
  }, [nf.fxAmt, nf.fxRate, nf.ccy]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await listL({ data: { member_id: member.id } });
      setLoans(r.loans);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [member.id]);

  async function addNew() {
    if (!nf.principal || Number(nf.principal) <= 0) { toast.error("Principal ఇవ్వండి"); return; }
    if (!nf.surety_name.trim() || !nf.surety_id.trim()) { toast.error("Surety Name + ID అవసరం"); return; }
    try {
      const purposeParts: string[] = [];
      if (nf.purpose.trim()) purposeParts.push(nf.purpose.trim());
      purposeParts.push(`Surety: ${nf.surety_name.trim()} (${nf.surety_id.trim()})`);
      if (nf.ccy !== "INR" && Number(nf.fxRate) > 0) {
        purposeParts.push(`FX: ${nf.fxAmt} ${nf.ccy} @ ${nf.fxRate}`);
      }
      await addL({
        data: {
          org_id: orgId, member_id: member.id,
          principal: Number(nf.principal),
          interest_rate_monthly: Number(nf.interest_rate_monthly || 0),
          start_date: nf.start_date,
          purpose: purposeParts.join(" | "),
        },
      });
      toast.success("Loan added");
      setShowAdd(false);
      setNf({
        principal: "", interest_rate_monthly: "1.5",
        start_date: new Date().toISOString().slice(0, 10), purpose: "",
        surety_name: "", surety_id: "",
        ccy: "INR", fxRate: "", fxAmt: "",
      });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeSuspensions = suspensions.filter((s) => {
    const st = (s.status || "").toLowerCase();
    if (st && st !== "active") return false;
    if (s.effective_until && s.effective_until < today) return false;
    return true;
  });
  const hasMajor = activeSuspensions.some((s) => {
    const c = (s.category || "").toLowerCase();
    return c === "major" || c === "severe" || c === "expulsion";
  });
  const hasMinor = activeSuspensions.some((s) => {
    const c = (s.category || "").toLowerCase();
    return !(c === "major" || c === "severe" || c === "expulsion");
  });
  // Status reflects admin-set behavior only — not loan activity.
  const statusColor: "green" | "yellow" | "red" =
    hasMajor ? "red" : hasMinor ? "yellow" : "green";
  const statusLabel =
    statusColor === "green" ? "మంచి ప్రవర్తన / Clear" :
    statusColor === "yellow" ? "చిన్న తప్పులు / Minor" : "పెద్ద తప్పులు / Major";
  const statusBg =
    statusColor === "green" ? "bg-emerald-600" :
    statusColor === "yellow" ? "bg-amber-500" : "bg-red-600";

  const setStatusFn = useServerFn(setMemberBehaviorStatus);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPickColor, setStatusPickColor] = useState<"green" | "yellow" | "red">(statusColor);
  const [statusReason, setStatusReason] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    if (statusOpen) {
      setStatusPickColor(statusColor);
      const currentReason = (activeSuspensions[0] as any)?.reason as string | undefined;
      setStatusReason(currentReason || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusOpen]);

  async function saveStatus() {
    setStatusBusy(true);
    try {
      await setStatusFn({
        data: {
          target_member_id: member.id,
          color: statusPickColor,
          reason: statusReason.trim() || undefined,
        },
      });
      // refresh suspensions
      const { data } = await supabase
        .from("disciplinary_suspensions")
        .select("category,status,effective_until,reason")
        .eq("target_member_id", member.id);
      setSuspensions((data as any) ?? []);
      toast.success("స్థితి నవీకరించబడింది");
      setStatusOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setStatusBusy(false);
    }
  }

  const dot = (c: "green" | "yellow" | "red") =>
    c === "green" ? "🟢" : c === "yellow" ? "🟡" : "🔴";

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="w-4 h-4 mr-1" /> కొత్త Loan
        </Button>
        <button
          type="button"
          onClick={() => setStatusOpen(true)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white text-xs font-semibold shadow ${statusBg} hover:opacity-90`}
          aria-label="Behavior status"
        >
          <span>స్థితి</span>
          <span className="text-base leading-none">{dot(statusColor)}</span>
        </button>
      </div>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>సభ్యుడి ప్రవర్తన స్థితి</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">కారణం</Label>
              <Textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="కారణం రాయండి (ఐచ్ఛికం)"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">రంగు ఎంపిక</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["green", "yellow", "red"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStatusPickColor(c)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 py-2 text-xs transition ${
                      statusPickColor === c
                        ? c === "green"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                          : c === "yellow"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                            : "border-red-500 bg-red-50 dark:bg-red-950"
                        : "border-muted"
                    }`}
                  >
                    <span className="text-2xl leading-none">{dot(c)}</span>
                    <span>
                      {c === "green" ? "మంచి" : c === "yellow" ? "చిన్న తప్పు" : "పెద్ద తప్పు"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStatusOpen(false)} disabled={statusBusy}>
                రద్దు
              </Button>
              <Button className="flex-1" onClick={saveStatus} disabled={statusBusy}>
                {statusBusy ? "…" : "సేవ్"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAdd && (
        <Card className="p-3 space-y-2 border-dashed">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">కరెన్సీ</Label>
              <select
                value={nf.ccy}
                onChange={(e) => setNf({ ...nf, ccy: e.target.value as LoanFxCode, fxAmt: "", principal: "" })}
                className="w-full rounded-md border px-2 py-2 text-sm bg-background"
              >
                <option value="INR">INR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="KWD">KWD (د.ك)</option>
                <option value="MYR">MYR (RM)</option>
              </select>
            </div>
            {nf.ccy !== "INR" && (
              <div>
                <Label className="text-xs">1 {nf.ccy} = ? Rs.</Label>
                <Input inputMode="decimal" value={nf.fxRate}
                  onChange={(e) => setNf({ ...nf, fxRate: e.target.value.replace(/[^\d.]/g, "") })}
                  placeholder="Rate" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {nf.ccy !== "INR" ? (
              <div>
                <Label className="text-xs">అసలు ({nf.ccy}) *</Label>
                <Input type="number" step="0.01" value={nf.fxAmt}
                  onChange={(e) => setNf({ ...nf, fxAmt: e.target.value })} placeholder="0" />
                <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                  = Rs. {Number(nf.principal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-xs">అసలు {symbol} *</Label>
                <Input type="number" step="0.01" value={nf.principal}
                  onChange={(e) => setNf({ ...nf, principal: e.target.value })} />
              </div>
            )}
            <div>
              <Label className="text-xs">నెల వడ్డీ %</Label>
              <Input type="number" step="0.01" value={nf.interest_rate_monthly}
                onChange={(e) => setNf({ ...nf, interest_rate_monthly: e.target.value })} />
            </div>
            <div><Label className="text-xs">తేదీ</Label>
              <DateInput value={nf.start_date} onChange={(e) => setNf({ ...nf, start_date: e.target.value })} /></div>
            <div><Label className="text-xs">ప్రయోజనం</Label>
              <Input value={nf.purpose} onChange={(e) => setNf({ ...nf, purpose: e.target.value })} /></div>
          </div>


          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <div>
              <Label>షూరిటీ పేరు / Surety Name *</Label>
              <Input value={nf.surety_name}
                onChange={(e) => setNf({ ...nf, surety_name: e.target.value })}
                placeholder="Surety full name" />
            </div>
            <div>
              <Label>షూరిటీ ID *</Label>
              <Input value={nf.surety_id}
                onChange={(e) => setNf({ ...nf, surety_id: e.target.value })}
                placeholder="Member ID" />
            </div>
          </div>

          <Button onClick={addNew} className="w-full">Add</Button>
        </Card>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : loans.length === 0 ? <p className="text-sm text-muted-foreground">Loans లేవు</p>
        : loans.map((l) => (
          <LoanCard key={l.id} loan={l} orgId={orgId} onChange={refresh}
            onClose={async () => { await closeL({ data: { loan_id: l.id } }); refresh(); }}
            onDelete={async () => {
              if (!confirm("Delete this loan?")) return;
              await delL({ data: { loan_id: l.id } }); refresh();
            }}
          />
        ))}
    </div>
  );
}

function LoanCard({ loan, orgId, onChange, onClose, onDelete }:
  { loan: Loan; orgId: string; onChange: () => void; onClose: () => void; onDelete: () => void }) {
  const listP = useServerFn(listLoanPayments);
  const addP = useServerFn(addLoanPayment);
  const { symbol } = useCurrency();
  const [pays, setPays] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadPays() {
    const r = await listP({ data: { loan_id: loan.id } });
    setPays(r.payments);
  }
  useEffect(() => { if (open) loadPays(); }, [open]);

  async function payNow() {
    if (!amt || Number(amt) <= 0) { toast.error("Amount ఇవ్వండి"); return; }
    try {
      await addP({ data: { loan_id: loan.id, org_id: orgId, amount: Number(amt), payment_date: date } });
      setAmt("");
      toast.success("Payment recorded");
      loadPays(); onChange();
    } catch (e: any) { toast.error(e.message); }
  }

  const s = loan.summary ?? {};
  return (
    <Card className={`p-3 ${loan.status === "closed" ? "opacity-70" : ""}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">Rs. {Number(loan.principal).toLocaleString("en-IN")}</span>
            <Badge variant="outline" className="text-xs">{loan.interest_rate_monthly}% /నెల</Badge>
            {loan.status === "closed" && <Badge className="bg-emerald-600">Closed</Badge>}
          </div>
          {loan.purpose && <p className="text-xs text-muted-foreground">{loan.purpose}</p>}
          <p className="text-xs text-muted-foreground">Start: {new Date(loan.start_date).toLocaleDateString("te-IN")}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs" style={{ color: "inherit" }}>
        <div className="rounded p-2" style={{ backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)", color: "inherit" }}>
          <div style={{ color: "inherit", opacity: 0.75 }}>Total Due</div>
          <div className="font-semibold" style={{ color: "inherit" }}>Rs. {Number(s.total_due ?? loan.principal).toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded p-2" style={{ backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)", color: "inherit" }}>
          <div style={{ color: "inherit", opacity: 0.75 }}>Paid</div>
          <div className="font-semibold" style={{ color: "inherit" }}>Rs. {Number(s.total_paid ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded p-2" style={{ backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)", color: "inherit" }}>
          <div style={{ color: "inherit", opacity: 0.75 }}>Balance</div>
          <div className="font-semibold" style={{ color: "inherit" }}>Rs. {Number(s.balance ?? 0).toLocaleString("en-IN")}</div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center">
        Interest accrued: Rs. {Number(s.accrued_interest ?? 0).toLocaleString("en-IN")} · {Number(s.months_elapsed ?? 0).toFixed(1)} నెలలు
      </p>

      <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setOpen((o) => !o)}>
        {open ? "మూసివేయి" : "Payments / Pay"}
      </Button>

      {open && (
        <div className="mt-2 space-y-2 border-t pt-2">
          {loan.status !== "closed" && (
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Label className="text-xs">Amount Rs.</Label>
                <Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
              <div><Label className="text-xs">Date</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <Button size="sm" onClick={payNow}>Pay</Button>
            </div>
          )}
          {pays.length > 0 ? (
            <div className="text-xs space-y-1">
              {pays.map((p) => (
                <div key={p.id} className="flex justify-between border-b pb-1">
                  <span>{new Date(p.payment_date).toLocaleDateString("te-IN")}</span>
                  <span className="font-medium">{symbol}{Number(p.amount).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No payments yet</p>}
          {loan.status !== "closed" && (
            <Button size="sm" variant="outline" className="w-full" onClick={onClose}>
              <Lock className="w-3 h-3 mr-1" /> Loan Close చేయి
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
