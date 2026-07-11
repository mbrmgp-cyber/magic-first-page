import { DateInput } from "@/components/DateInput";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User, UserPlus, Camera, Trash2, IndianRupee, Award, Plus, CheckCircle2, XCircle, Pencil, Settings,
} from "lucide-react";
import {
  listDonors, adminAddDonor, updateDonor, deleteDonor, reviewDonor,
  addDonation, listDonorDonations, deleteDonation, updateOrgDonorThreshold,
} from "@/lib/donors.functions";
import { listApprovedMembers } from "@/lib/members.functions";
import { DonorMomentoButton } from "@/components/DonorMomento";

type Donor = any;

export function DonorsPanel({ recognitionOnly = false }: { recognitionOnly?: boolean }) {
  const list = useServerFn(listDonors);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(5000);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  async function refresh() {
    setLoading(true);
    try {
      const r: any = await list();
      setDonors(r.donors);
      setOrgId(r.orgId);
      setThreshold(Number(r.threshold ?? 5000));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    let base = donors;
    if (recognitionOnly) {
      base = donors.filter((d) => Number(d.total_donated ?? 0) >= threshold);
    } else if (filter !== "all") {
      base = donors.filter((d) => d.status === filter);
    }
    return [...base].sort((a, b) => Number(b.total_donated ?? 0) - Number(a.total_donated ?? 0));
  }, [donors, filter, recognitionOnly, threshold]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!recognitionOnly ? (
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved"] as const).map((s) => (
              <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
                {s === "all" ? "అందరూ" : s === "pending" ? "Pending" : "Approved"}
                <Badge variant="secondary" className="ml-2">
                  {s === "all" ? donors.length : donors.filter((d) => d.status === s).length}
                </Badge>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            ₹{threshold.toLocaleString("en-IN")} కంటే ఎక్కువ విరాళం ఇచ్చిన డోనర్లు
          </div>
        )}
        <div className="flex gap-2">
          {!recognitionOnly && orgId && <AddDonorDialog onAdded={refresh} />}
          {recognitionOnly && <ThresholdDialog current={threshold} onSaved={refresh} />}
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          {recognitionOnly ? "గుర్తింపు పొందిన డోనర్లు ఇంకా లేరు" : "డోనర్లు లేరు"}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DonorCard key={d.id} donor={d} threshold={threshold} onChange={refresh} recognitionMode={recognitionOnly} />
          ))}
        </div>
      )}
    </div>
  );
}

function DonorCard({ donor, threshold, onChange, recognitionMode }:
  { donor: Donor; threshold: number; onChange: () => void; recognitionMode: boolean }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!donor.photo_url) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("member-photos")
        .createSignedUrl(donor.photo_url, 3600);
      if (!cancelled && data?.signedUrl) setPhotoUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [donor.photo_url]);

  const total = Number(donor.total_donated ?? 0);
  const recognized = total >= threshold;
  const fullName = [donor.first_name, donor.last_name].filter(Boolean).join(" ");

  return (
    <Card className="p-4 bg-white/95">
      <div className="flex gap-3 items-start">
        <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" onError={() => setPhotoUrl(null)} />
          ) : (
            <User className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold truncate">{fullName || "—"}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              donor.status === "approved" ? "bg-emerald-100 text-emerald-700" :
              donor.status === "inactive" ? "bg-gray-200 text-gray-600" :
              "bg-amber-100 text-amber-700"
            }`}>{donor.status}</span>
            {recognized && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                <Award className="w-3 h-3" /> గుర్తింపు
              </span>
            )}
          </div>
          {donor.phone && <p className="text-xs text-muted-foreground">📞 {donor.phone}</p>}
          {donor.email && <p className="text-xs text-muted-foreground truncate">{donor.email}</p>}
          {donor.linked_member?.name && (
            <p className="text-xs text-muted-foreground">
              సభ్యుడు: {donor.linked_member.name} {donor.linked_member.member_code ? `(${donor.linked_member.member_code})` : ""}
            </p>
          )}
          <p className="text-sm font-semibold mt-1">
            మొత్తం విరాళం: <span className="text-emerald-700">₹{total.toLocaleString("en-IN")}</span>
          </p>
          {recognitionMode && (
            <p className="text-xs mt-1">
              మెమెంటో: {donor.momento_issued ? (
                <span className="text-emerald-700">
                  ✓ ఇచ్చాము {donor.momento_issued_at ? `(${new Date(donor.momento_issued_at).toLocaleDateString("te-IN")})` : ""}
                </span>
              ) : (
                <span className="text-amber-700">పెండింగ్</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {donor.status === "pending" && (
          <>
            <ReviewDonorButton donorId={donor.id} action="approve" onDone={onChange} />
            <ReviewDonorButton donorId={donor.id} action="reject" onDone={onChange} />
          </>
        )}
        {donor.status !== "pending" && (
          <>
            <AddDonationDialog donor={donor} onSaved={onChange} />
            <DonationsDialog donor={donor} onChanged={onChange} />
            <EditDonorDialog donor={donor} onSaved={onChange} />
            {recognitionMode && recognized && (
              <>
                <MomentoToggle donor={donor} onChange={onChange} />
                <DonorMomentoButton donor={donor} />
              </>
            )}
          </>
        )}
        <DeleteDonorButton donor={donor} onDone={onChange} />
      </div>
    </Card>
  );
}

function ReviewDonorButton({ donorId, action, onDone }:
  { donorId: string; action: "approve" | "reject"; onDone: () => void }) {
  const fn = useServerFn(reviewDonor);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await fn({ data: { donor_id: donorId, action } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  return action === "approve" ? (
    <Button size="sm" disabled={busy} onClick={go} className="bg-emerald-600 hover:bg-emerald-700">
      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
    </Button>
  ) : (
    <Button size="sm" variant="outline" disabled={busy} onClick={go}>
      <XCircle className="w-4 h-4 mr-1" /> Reject
    </Button>
  );
}

function MomentoToggle({ donor, onChange }: { donor: Donor; onChange: () => void }) {
  const fn = useServerFn(updateDonor);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await fn({ data: { donor_id: donor.id, momento_issued: !donor.momento_issued } });
      onChange();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  return (
    <Button size="sm" variant={donor.momento_issued ? "secondary" : "default"} disabled={busy} onClick={toggle}>
      <Award className="w-4 h-4 mr-1" />
      {donor.momento_issued ? "మెమెంటో ఇవ్వబడింది" : "మెమెంటో ఇచ్చినట్లు గుర్తించండి"}
    </Button>
  );
}

function DeleteDonorButton({ donor, onDone }: { donor: Donor; onDone: () => void }) {
  const del = useServerFn(deleteDonor);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await del({ data: { donor_id: donor.id } });
      toast.success("డిలీట్ అయింది");
      onDone();
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
          <AlertDialogTitle>డోనర్‌ని తొలగించాలా?</AlertDialogTitle>
          <AlertDialogDescription>
            {donor.first_name} {donor.last_name} — విరాళాలతో సహా శాశ్వతంగా తొలగించబడతారు.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={go} className="bg-rose-600 hover:bg-rose-700">
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddDonorDialog({ onAdded }: { onAdded: () => void }) {
  const add = useServerFn(adminAddDonor);
  const upd = useServerFn(updateDonor);
  const listAppr = useServerFn(listApprovedMembers);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; member_code: string | null }[]>([]);
  const initial = {
    first_name: "", last_name: "", phone: "", email: "", linked_member_id: "", notes: "",
  };
  const [f, setF] = useState(initial);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listAppr().then((r: any) => setMembers(r.members ?? [])).catch(() => {});
  }, [open]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!f.first_name.trim()) { toast.error("పేరు ఇవ్వండి"); return; }
    setSaving(true);
    try {
      const r: any = await add({
        data: {
          first_name: f.first_name.trim(),
          last_name: f.last_name || null,
          phone: f.phone || null,
          email: f.email || null,
          linked_member_id: f.linked_member_id || null,
          notes: f.notes || null,
          status: "approved",
        },
      });
      if (photoFile && r.id && r.orgId) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `admin/${r.orgId}/donors/${r.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("member-photos")
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) toast.error("ఫోటో అప్‌లోడ్ విఫలమైంది: " + upErr.message);
        else await upd({ data: { donor_id: r.id, photo_url: path, send_login_link: false } });
      }
      toast.success(r?.linkSent ? "డోనర్ చేర్చబడ్డారు · లాగిన్ లింక్ ఈమెయిల్‌కు పంపబడింది" : "డోనర్ చేర్చబడ్డారు");
      if (r?.linkError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.linkError);
      setOpen(false);
      setF(initial);
      setPhotoFile(null); setPhotoPreview(null);
      onAdded();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <UserPlus className="w-4 h-4 mr-1" /> డోనర్ చేర్చు
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>కొత్త డోనర్</DialogTitle></DialogHeader>
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>మొదటి పేరు *</Label>
              <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
            <div><Label>ఇంటిపేరు</Label>
              <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Email</Label>
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div>
            <Label>సభ్యుడితో లింక్ (ఐచ్ఛికం)</Label>
            <Select value={f.linked_member_id || "none"} onValueChange={(v) => setF({ ...f, linked_member_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="ఎంచుకోండి" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— ఏదీ లేదు —</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} {m.member_code ? `(${m.member_code})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>నోట్స్</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "సేవ్ అవుతోంది…" : "సేవ్"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDonorDialog({ donor, onSaved }: { donor: Donor; onSaved: () => void }) {
  const upd = useServerFn(updateDonor);
  const listAppr = useServerFn(listApprovedMembers);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; member_code: string | null }[]>([]);
  const [f, setF] = useState({
    first_name: donor.first_name || "",
    last_name: donor.last_name || "",
    phone: donor.phone || "",
    email: donor.email || "",
    linked_member_id: donor.linked_member_id || "",
    notes: donor.notes || "",
    status: donor.status || "approved",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listAppr().then((r: any) => setMembers(r.members ?? [])).catch(() => {});
    if (donor.photo_url) {
      supabase.storage.from("member-photos").createSignedUrl(donor.photo_url, 3600)
        .then(({ data }) => data?.signedUrl && setExistingPhotoUrl(data.signedUrl));
    }
  }, [open]);

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
      let newPath: string | undefined;
      if (photoFile && donor.org_id) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `admin/${donor.org_id}/donors/${donor.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("member-photos")
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) throw new Error("ఫోటో అప్‌లోడ్ విఫలమైంది: " + upErr.message);
        newPath = path;
      }
      const r: any = await upd({ data: {
        donor_id: donor.id,
        first_name: f.first_name.trim(),
        last_name: f.last_name || null,
        phone: f.phone || null,
        email: f.email || null,
        linked_member_id: f.linked_member_id || null,
        notes: f.notes || null,
        status: f.status as any,
        send_login_link: true,
        ...(newPath ? { photo_url: newPath } : {}),
      }});
      toast.success(r?.linkSent ? "సేవ్ అయింది · లాగిన్ లింక్ ఈమెయిల్‌కు పంపబడింది" : "సేవ్ అయింది");
      if (r?.linkError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.linkError);
      setOpen(false);
      setPhotoFile(null); setPhotoPreview(null);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="w-4 h-4 mr-1" /> ఎడిట్</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>డోనర్ వివరాలు ఎడిట్</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
              {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" />
                : existingPhotoUrl ? <img src={existingPhotoUrl} className="h-full w-full object-cover" />
                : <User className="w-8 h-8 text-muted-foreground" />}
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border cursor-pointer hover:bg-accent">
              <Camera className="w-4 h-4" /> ఫోటో మార్చండి
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>మొదటి పేరు</Label>
              <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
            <div><Label>ఇంటిపేరు</Label>
              <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Email</Label>
              <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div>
            <Label>సభ్యుడితో లింక్</Label>
            <Select value={f.linked_member_id || "none"} onValueChange={(v) => setF({ ...f, linked_member_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="ఎంచుకోండి" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— ఏదీ లేదు —</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} {m.member_code ? `(${m.member_code})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>స్థితి</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>నోట్స్</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving} onClick={save}>{saving ? "సేవ్…" : "సేవ్"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AddDonationDialog({ donor, onSaved }: { donor: Donor; onSaved: () => void }) {
  const add = useServerFn(addDonation);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const initial = { amount: "", donation_date: today, mode: "cash", receipt_no: "", notes: "" };
  const [f, setF] = useState(initial);

  async function submit() {
    const amt = Number(f.amount);
    if (!(amt > 0)) { toast.error("Amount ఇవ్వండి"); return; }
    setSaving(true);
    try {
      const r: any = await add({ data: {
        donor_id: donor.id,
        amount: amt,
        donation_date: f.donation_date,
        mode: f.mode as any,
        receipt_no: f.receipt_no || null,
        notes: f.notes || null,
      }});
      toast.success(r?.linkSent ? "విరాళం నమోదైంది · డోనర్‌కు లాగిన్ లింక్ పంపబడింది" : "విరాళం నమోదైంది");
      if (r?.linkError) toast.error("లాగిన్ లింక్ పంపడంలో సమస్య: " + r.linkError);
      setOpen(false);
      setF(initial);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          <IndianRupee className="w-4 h-4 mr-1" /> విరాళం జోడించు
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>విరాళం నమోదు — {donor.first_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount ₹ *</Label>
              <Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div><Label>Date</Label>
              <DateInput value={f.donation_date} onChange={(e) => setF({ ...f, donation_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={f.mode} onValueChange={(v) => setF({ ...f, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Receipt No.</Label>
              <Input value={f.receipt_no} onChange={(e) => setF({ ...f, receipt_no: e.target.value })} /></div>
          </div>
          <div><Label>నోట్స్</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "సేవ్…" : "సేవ్"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DonationsDialog({ donor, onChanged }: { donor: Donor; onChanged: () => void }) {
  const listFn = useServerFn(listDonorDonations);
  const delFn = useServerFn(deleteDonation);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r: any = await listFn({ data: { donor_id: donor.id } });
      setRows(r.donations ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (open) refresh(); }, [open]);

  async function del(id: string) {
    try {
      await delFn({ data: { donation_id: id } });
      toast.success("Deleted");
      refresh();
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">విరాళాలు చూడు</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>విరాళాల చరిత్ర — {donor.first_name}</DialogTitle></DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <p className="text-sm text-muted-foreground">విరాళాలు లేవు</p> :
          <div className="space-y-2">
            {rows.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <div className="font-semibold">₹{Number(d.amount).toLocaleString("en-IN")} <span className="text-xs text-muted-foreground">({d.mode})</span></div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(d.donation_date).toLocaleDateString("te-IN")}
                    {d.receipt_no ? ` • Rcpt: ${d.receipt_no}` : ""}
                  </div>
                  {d.notes && <div className="text-xs">{d.notes}</div>}
                </div>
                <Button size="sm" variant="destructive" onClick={() => del(d.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}

function ThresholdDialog({ current, onSaved }: { current: number; onSaved: () => void }) {
  const fn = useServerFn(updateOrgDonorThreshold);
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(current));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setVal(String(current)); }, [current]);

  async function save() {
    const n = Number(val);
    if (!(n >= 0)) { toast.error("Threshold తప్పు"); return; }
    setBusy(true);
    try {
      await fn({ data: { threshold: n } });
      toast.success("సేవ్ అయింది");
      setOpen(false);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Settings className="w-4 h-4 mr-1" /> Threshold</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>గుర్తింపు Threshold</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>ఎంత కంటే ఎక్కువ విరాళం ఇస్తే గుర్తింపు?</Label>
          <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? "సేవ్…" : "సేవ్"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
