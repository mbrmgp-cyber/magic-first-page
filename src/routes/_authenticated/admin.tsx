import { OrganizationRegistrationDetails } from "@/components/OrganizationRegistrationDetails";
import { organizationFormFromRow, type OrganizationForm } from "@/lib/admin-organization";
import { useI18n } from "@/lib/i18n";
import { DateInput } from "@/components/DateInput";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getOrgDocumentSignedUrl, getMyRoles, claimMbrAdmin, listAllOrgsForAdmin, reviewOrganization, adminSearchMembers, adminUpdateMemberCode, setOrganizationStatus, getOrganizationDetails, setOrgSubscription, adminUpdateOrganization, adminDeleteOrganization, listOrgReceipts, adminReviewMember } from "@/lib/org.functions";
import { printReceipt } from "@/lib/subscription-receipt";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, XCircle, Clock, LogOut, Image as ImageIcon, FileText, Users, IdCard, Search, Save, Building2, Eye, Ban, PlayCircle, PauseCircle, CalendarClock, Pencil, Trash2, AlertTriangle, Receipt, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

function OrgDocThumb({ orgId, path }: { orgId: string; path: string }) {
  const resolve = useServerFn(getOrgDocumentSignedUrl);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    resolve({ data: { org_id: orgId, path } })
      .then((r: any) => { if (alive) setUrl(r?.url ?? null); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [orgId, path]);
  if (!url) {
    return (
      <div className="w-12 h-12 rounded border bg-zinc-900 animate-pulse shrink-0" style={{ borderColor: "#3f3f46" }} />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener" className="shrink-0">
      <img src={url} alt="Uploaded identity document preview" className="w-12 h-12 rounded border object-cover hover:scale-110 transition" style={{ borderColor: "#3f3f46" }} />
    </a>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "MBR Platform — Admin Panel" },
    { name: "description", content: "Manage societies, organization members and approvals in MBR Platform." },
    { property: "og:title", content: "MBR Platform — Admin Panel" },
    { property: "og:description", content: "Manage societies, organization members and approvals in MBR Platform." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPanel,
});

function AdminPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const claim = useServerFn(claimMbrAdmin);
  const fetchOrgs = useServerFn(listAllOrgsForAdmin);
  const review = useServerFn(reviewOrganization);
  const setStatus = useServerFn(setOrganizationStatus);

  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const isAdmin = rolesQ.data?.roles.includes("mbr_admin") ?? false;

  const orgsQ = useQuery({
    queryKey: ["admin-all-orgs"],
    queryFn: () => fetchOrgs(),
    enabled: isAdmin,
  });

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendOrg, setSuspendOrg] = useState<any | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState("");

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function onClaim() {
    try {
      await claim();
      toast.success("మీరు ఇప్పుడు MBR Admin");
      qc.invalidateQueries({ queryKey: ["my-roles"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function doReview(orgId: string, action: "approve" | "reject") {
    setBusyId(orgId);
    try {
      await review({ data: { org_id: orgId, action, notes: notes[orgId] } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSuspend() {
    if (!suspendOrg) return;
    setBusyId(suspendOrg.id);
    try {
      await setStatus({ data: { org_id: suspendOrg.id, status: "suspended", notes: "Suspended by Super Admin" } });
      toast.success("Organization suspended");
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
      setSuspendOrg(null);
      setSuspendConfirm("");
    }
  }

  if (rolesQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="w-full max-w-md p-6 text-center space-y-4 bg-zinc-900/95 border-zinc-700 text-white shadow-2xl">
          <img src={mbrLogo.url} alt="MBR" className="w-16 h-16 mx-auto rounded-md bg-black border border-zinc-700 p-1.5" />
          <h1 className="text-xl font-bold text-white">MBR Admin Bootstrap</h1>
          <p className="text-sm text-zinc-400">
            ఇంకా MBR Admin assign కాలేదు. మీరు మొదటిగా admin role తీసుకోవచ్చు. Claim చేసిన తర్వాత ఇతరులు ఈ button ద్వారా claim చేయలేరు.
          </p>
          <Button onClick={onClaim} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
            <ShieldCheck className="h-4 w-4 mr-2" />నేను MBR Admin అవుతాను
          </Button>
          <Button onClick={logout} variant="ghost" size="sm" className="w-full text-white hover:bg-zinc-800">
            <LogOut className="h-4 w-4 mr-1" />Logout
          </Button>
        </Card>
      </div>
    );
  }

  const orgs = orgsQ.data?.orgs ?? [];
  const filtered = filter === "all" ? orgs : orgs.filter((o) => o.approval_status === filter);
  const counts = {
    pending: orgs.filter((o) => o.approval_status === "pending").length,
    approved: orgs.filter((o) => o.approval_status === "approved").length,
    rejected: orgs.filter((o) => o.approval_status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={mbrLogo.url} alt="MBR" className="w-12 h-12 rounded-md bg-black border border-zinc-700 p-1" />
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-green-400" /> MBR Admin Panel</h1>
              <p className="text-xs text-zinc-400">Society approvals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            
            <Button onClick={logout} variant="ghost" size="sm" className="text-white hover:bg-zinc-800 border border-zinc-700"><LogOut className="h-4 w-4 mr-1" />Logout</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`p-3 rounded-lg border text-left transition ${filter === f ? "bg-zinc-900 shadow-md border-[#ff8c28] ring-1 ring-[#ff8c28]/50" : "bg-zinc-900/70 border-zinc-700 text-white"}`}
            >
              <div className="text-xs uppercase text-zinc-400">{f}</div>
              <div className="text-xl font-bold text-white">
                {f === "all" ? orgs.length : counts[f as keyof typeof counts]}
              </div>
            </button>
          ))}
        </div>

        <MemberIdUpdater />

        <MbrGlobalAdsManager />

        <AllOrganizationsManager />





        {orgsQ.isLoading && <Card className="p-6 text-center bg-zinc-900/95 border-zinc-700 text-white">Loading societies…</Card>}

        {!orgsQ.isLoading && filtered.length === 0 && (
          <Card className="p-6 text-center bg-zinc-900/95 border-zinc-700 text-zinc-400">
            {filter === "pending" ? "Pending applications లేవు 🎉" : "ఈ filter లో societies లేవు"}
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((o) => {
            const founders = Array.isArray(o.founders) ? (o.founders as any[]) : [];
            const statusColor =
              o.approval_status === "approved" ? "bg-green-900/60 text-green-200 border-green-700" :
              o.approval_status === "rejected" ? "bg-red-900/60 text-red-200 border-red-700" :
              "bg-amber-900/60 text-amber-200 border-amber-700";
            return (
              <Card key={o.id} className="p-4 bg-zinc-900/95 border-zinc-700 text-white shadow-md space-y-3">
                <div className="flex items-start gap-3">
                  {o.logo_url ? (
                    <img src={o.logo_url} alt="" className="w-16 h-16 rounded-md border object-cover bg-black shrink-0" style={{ borderColor: "#3f3f46" }} />
                  ) : (
                    <div className="w-16 h-16 rounded-md border bg-zinc-800 flex items-center justify-center shrink-0" style={{ borderColor: "#3f3f46" }}>
                      <ImageIcon className="h-6 w-6 text-zinc-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate text-white">{o.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${statusColor}`}>
                        {o.approval_status}
                      </span>
                    </div>
                    {o.slogan && <p className="text-xs italic text-zinc-400">"{o.slogan}"</p>}
                    <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
                      <div>📧 {o.email}</div>
                      {o.phone && <div>📞 {o.phone}</div>}
                      {o.gov_reg_number && <div className="font-mono">Reg No: {o.gov_reg_number}</div>}
                      <div className="font-mono text-[10px]">Code: {o.org_code}</div>
                    </div>
                  </div>
                </div>

                {founders.length > 0 && (
                  <div className="border-t border-zinc-700 pt-2">
                    <div className="text-xs font-semibold flex items-center gap-1 mb-2 text-white"><Users className="h-3 w-3" /> Founders ({founders.length})</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {founders.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-zinc-800/60 rounded text-xs">
                          {f.aadhaar_url ? (
                            <OrgDocThumb orgId={o.id} path={f.aadhaar_url} />
                          ) : (
                            <div className="w-12 h-12 rounded border bg-zinc-900 flex items-center justify-center shrink-0" style={{ borderColor: "#3f3f46" }}>
                              <FileText className="h-4 w-4 text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold truncate text-white">{f.name || "—"}</div>
                            {f.address && <div className="text-zinc-400 text-[10px] truncate">{f.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {o.approval_status === "rejected" && o.approval_notes && (
                  <Alert variant="destructive" className="py-2 bg-red-900/30 border-red-800 text-red-100">
                    <AlertTitle className="text-xs">Rejection reason</AlertTitle>
                    <AlertDescription className="text-xs">{o.approval_notes}</AlertDescription>
                  </Alert>
                )}

                {o.approval_status === "pending" && (
                  <div className="border-t border-zinc-700 pt-3 space-y-2">
                    <Textarea
                      placeholder="Notes / reason (rejection కి compulsory)"
                      rows={2}
                      value={notes[o.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                      className="text-sm bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={busyId === o.id}
                        onClick={() => doReview(o.id, "approve")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={busyId === o.id || !notes[o.id]?.trim()}
                        onClick={() => doReview(o.id, "reject")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                )}

                {o.approval_status !== "pending" && (
                  <div className="border-t border-zinc-700 pt-2 space-y-2">
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {o.approved_at ? new Date(o.approved_at).toLocaleString() : "—"}
                    </div>
                    {o.approval_status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-amber-900/40 hover:bg-amber-900/60 border-amber-700 text-amber-100"
                        disabled={busyId === o.id}
                        onClick={() => { setSuspendOrg(o); setSuspendConfirm(""); }}
                      >
                        <PauseCircle className="h-4 w-4 mr-1" />Suspend Organization
                      </Button>
                    )}
                    {o.approval_status === "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-green-900/40 hover:bg-green-900/60 border-green-700 text-green-100"
                        disabled={busyId === o.id}
                        onClick={async () => {
                          setBusyId(o.id);
                          try {
                            await setStatus({ data: { org_id: o.id, status: "approved", notes: "Reactivated by Super Admin" } });
                            toast.success("Organization reactivated");
                            qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
                          } catch (e: any) {
                            toast.error(e.message ?? "Failed");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />Reactivate
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <SuspendConfirmDialog
        org={suspendOrg}
        open={!!suspendOrg}
        confirmText={suspendConfirm}
        onConfirmTextChange={setSuspendConfirm}
        onConfirm={confirmSuspend}
        onOpenChange={(open: boolean) => { if (!open) { setSuspendOrg(null); setSuspendConfirm(""); } }}
        busy={busyId === suspendOrg?.id}
      />
    </div>
  );
}

function MemberIdUpdater() {
  const search = useServerFn(adminSearchMembers);
  const update = useServerFn(adminUpdateMemberCode);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await search({ data: { q: q.trim() } });
      setResults(r.members);
      const init: Record<string, string> = {};
      r.members.forEach((m: any) => { init[m.id] = m.member_code ?? ""; });
      setEdits(init);
    } catch (err: any) {
      toast.error(err.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function save(m: any) {
    const code = (edits[m.id] ?? "").trim();
    if (!code || code === m.member_code) return;
    setBusy(m.id);
    try {
      await update({ data: { member_id: m.id, new_code: code } });
      toast.success(`ID updated to ${code}`);
      setResults((rs) => rs.map((r) => r.id === m.id ? { ...r, member_code: code } : r));
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-4 bg-zinc-900/95 border-zinc-700 text-white shadow-md space-y-3">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-[#ff8c28]" />
        <h2 className="font-bold text-white">Member ID Update (Super Admin)</h2>
      </div>
      <p className="text-xs text-zinc-400">
        ఏ సొసైటీ లోనైనా సభ్యుని ID నెంబరును మార్చండి. Name / ID / Email / Phone తో వెతకండి.
      </p>
      <form onSubmit={doSearch} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, email, phone…" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-300" />
        <Button type="submit" disabled={loading || !q.trim()} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
          <Search className="h-4 w-4 mr-1 text-white" />{loading ? "…" : "Search"}
        </Button>
      </form>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 border rounded bg-zinc-800/60" style={{ borderColor: "#3f3f46" }}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate text-white">{m.name}</div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {(m.organizations as any)?.name ?? "—"} · {m.email ?? ""} {m.phone ? `· ${m.phone}` : ""}
                </div>
              </div>
              <Input
                className="w-36 font-mono text-sm bg-zinc-900 border-zinc-700 text-white"
                value={edits[m.id] ?? ""}
                onChange={(e) => setEdits((x) => ({ ...x, [m.id]: e.target.value.toUpperCase() }))}
              />
              <Button size="sm" disabled={busy === m.id || !edits[m.id]?.trim() || edits[m.id] === m.member_code} onClick={() => save(m)} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
                <Save className="h-4 w-4 mr-1" />Save
              </Button>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && q && (
        <div className="text-xs text-zinc-400">No results yet — try Search.</div>
      )}
    </Card>
  );
}

type OrgStatus = "pending" | "approved" | "rejected" | "suspended";

const STATUS_STYLES: Record<OrgStatus, string> = {
  pending: "bg-amber-900/60 text-amber-200 border-amber-700",
  approved: "bg-green-900/60 text-green-200 border-green-700",
  rejected: "bg-red-900/60 text-red-200 border-red-700",
  suspended: "bg-zinc-800 text-zinc-200 border-zinc-600",
};

const STATUS_LABEL: Record<OrgStatus, string> = {
  pending: "Pending",
  approved: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

function AllOrganizationsManager() {
  const { lang } = useI18n();
  const L = (en: string, te: string, hi: string) => lang === "te" ? te : lang === "hi" ? hi : en;
  const qc = useQueryClient();
  const fetchOrgs = useServerFn(listAllOrgsForAdmin);
  const setStatus = useServerFn(setOrganizationStatus);
  const getDetails = useServerFn(getOrganizationDetails);
  const setSub = useServerFn(setOrgSubscription);
  const updateOrg = useServerFn(adminUpdateOrganization);
  const deleteOrg = useServerFn(adminDeleteOrganization);

  const orgsQ = useQuery({ queryKey: ["admin-all-orgs"], queryFn: () => fetchOrgs() });
  const [busy, setBusy] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expiryEdits, setExpiryEdits] = useState<Record<string, string>>({});
  const [openOrgId, setOpenOrgId] = useState<string | null>(null);
  const [editOrg, setEditOrg] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<OrganizationForm>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteOrgState, setDeleteOrgState] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [suspendOrgState, setSuspendOrgState] = useState<any | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState("");
  const [receiptsOrg, setReceiptsOrg] = useState<any | null>(null);
  const [renewOrg, setRenewOrg] = useState<any | null>(null);
  const [renewForm, setRenewForm] = useState<{ amount: string; currency: string; days: string; method: string; notes: string }>({
    amount: "", currency: "INR", days: "365", method: "cash", notes: "",
  });

  const detailsQ = useQuery({
    queryKey: ["admin-org-details", detailsId],
    queryFn: () => {
      if (!detailsId) throw new Error("Organization not selected");
      return getDetails({ data: { org_id: detailsId } });
    },
    enabled: !!detailsId,
  });

  const reviewMemberFn = useServerFn(adminReviewMember);
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  async function reviewMember(memberId: string, action: "approve" | "reject") {
    setMemberBusy(memberId);
    try {
      await reviewMemberFn({ data: { member_id: memberId, action } });
      toast.success(action === "approve" ? "Member approved" : "Member rejected");
      qc.invalidateQueries({ queryKey: ["admin-org-details", detailsId] });
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setMemberBusy(null);
    }
  }


  async function changeStatus(orgId: string, status: OrgStatus) {
    setBusy(orgId);
    try {
      await setStatus({ data: { org_id: orgId, status } });
      toast.success(`Status updated to ${STATUS_LABEL[status]}`);
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveExpiry(orgId: string, expires_at?: string, extend_days?: number) {
    setBusy(orgId);
    try {
      await setSub({ data: { org_id: orgId, expires_at, extend_days, create_receipt: false } });
      toast.success("Subscription updated");
      setExpiryEdits((p) => ({ ...p, [orgId]: "" }));
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(null);
    }
  }

  function openRenew(o: any) {
    setRenewOrg(o);
    setRenewForm({ amount: "", currency: "INR", days: "365", method: "cash", notes: "" });
  }

  async function submitRenew() {
    if (!renewOrg) return;
    const amount = Number(renewForm.amount);
    const days = Number(renewForm.days);
    if (!(amount > 0)) { toast.error("Enter a valid amount"); return; }
    if (!(days > 0)) { toast.error("Enter valid days"); return; }
    setBusy(renewOrg.id);
    try {
      const res: any = await setSub({
        data: {
          org_id: renewOrg.id,
          extend_days: days,
          amount,
          currency: renewForm.currency.toUpperCase(),
          payment_method: renewForm.method,
          notes: renewForm.notes || undefined,
          create_receipt: true,
        },
      });
      toast.success(`Renewed. Receipt ${res?.receipt?.receipt_number ?? ""}`);
      // Immediately print receipt
      if (res?.receipt) {
        printReceipt(renewOrg, res.receipt);
      }
      setRenewOrg(null);
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Renewal failed");
    } finally {
      setBusy(null);
    }
  }

  async function openEdit(o: any) {
    setEditOrg(o);
    setEditLoading(true);
    setEditError("");
    try {
      const result = await getDetails({ data: { org_id: o.id } });
      setEditForm(organizationFormFromRow(result.org));
    } catch (e: any) {
      setEditError(e.message ?? "Unable to load organization");
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editOrg) return;
    setBusy(editOrg.id);
    try {
      await updateOrg({ data: { org_id: editOrg.id, ...editForm } });
      toast.success(L("Organization updated", "సంస్థ వివరాలు నవీకరించబడ్డాయి", "संस्था का विवरण अपडेट किया गया"));
      setEditOrg(null);
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
      qc.invalidateQueries({ queryKey: ["admin-org-details"] });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteOrgState) return;
    setBusy(deleteOrgState.id);
    try {
      await deleteOrg({ data: { org_id: deleteOrgState.id, confirm_code: deleteConfirm } });
      toast.success("Organization deleted");
      setDeleteOrgState(null);
      setDeleteConfirm("");
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmSuspend() {
    if (!suspendOrgState) return;
    setBusy(suspendOrgState.id);
    try {
      await setStatus({ data: { org_id: suspendOrgState.id, status: "suspended", notes: "Suspended by Super Admin" } });
      toast.success("Organization suspended");
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Suspend failed");
    } finally {
      setBusy(null);
      setSuspendOrgState(null);
      setSuspendConfirm("");
    }
  }



  const orgs = (orgsQ.data?.orgs ?? []) as any[];
  const q = search.trim().toLowerCase();
  const filtered = (q
    ? orgs.filter((o) =>
        [o.name, o.email, o.phone, o.org_code, o.gov_reg_number]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(q)),
      )
    : orgs
  ).slice().sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "en", { sensitivity: "base" }));

  return (
    <>
      <Card className="p-4 bg-zinc-900/95 border-zinc-700 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-green-400" />
          <h2 className="font-bold text-white">All Organizations ({orgs.length})</h2>
        </div>
        <p className="text-xs text-zinc-400">
          సొసైటీని Active / Suspended / Rejected గా మార్చండి. వివరాలు చూడడానికి View నొక్కండి.
        </p>
        <Input
          placeholder="Search by name, code, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-300"
        />

        {orgsQ.isLoading && <div className="text-sm text-zinc-400 text-center py-4">Loading…</div>}

        <div className="space-y-2">
          {filtered.map((o) => {
            const status = (o.approval_status ?? "pending") as OrgStatus;
            const expRaw = o.subscription_expires_at as string | null;
            const expDate = expRaw ? new Date(expRaw) : null;
            const expired = !!expDate && expDate.getTime() < Date.now();
            const expLabel = expDate
              ? expDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "—";
            const inputVal =
              expiryEdits[o.id] ?? (expDate ? expDate.toISOString().slice(0, 10) : "");
            const lineColor =
              status === "approved" ? "#22c55e" : status === "suspended" || status === "rejected" ? "#ef4444" : "#eab308";
            const open = openOrgId === o.id;
            return (
              <div key={o.id} className="border rounded-lg bg-zinc-800/60 overflow-hidden" style={{ borderColor: "#3f3f46", borderLeft: `6px solid ${lineColor}` }}>
                <button
                  type="button"
                  onClick={() => setOpenOrgId(open ? null : o.id)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <span className="font-semibold text-sm truncate text-white flex-1">{o.name}</span>
                  <span className="text-[10px] font-semibold uppercase" style={{ color: lineColor }}>{STATUS_LABEL[status]}</span>
                  <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                <div className="p-3 pt-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {o.logo_url ? (
                      <img src={o.logo_url} alt="" className="w-10 h-10 rounded border object-cover bg-black shrink-0" style={{ borderColor: "#3f3f46" }} />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-zinc-900 flex items-center justify-center shrink-0" style={{ borderColor: "#3f3f46" }}>
                        <Building2 className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate text-white">{o.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate font-mono">
                        {o.org_code} · {o.email ?? "—"}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${STATUS_STYLES[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>

                  <Select
                    value={status}
                    onValueChange={(v) => {
                      if (v === "suspended") {
                        setSuspendOrgState(o);
                        setSuspendConfirm("");
                      } else {
                        changeStatus(o.id, v as OrgStatus);
                      }
                    }}
                    disabled={busy === o.id}
                  >
                    <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="pending"><Clock className="h-3 w-3 inline mr-1" />Pending</SelectItem>
                      <SelectItem value="approved"><PlayCircle className="h-3 w-3 inline mr-1" />Active</SelectItem>
                      <SelectItem value="suspended"><PauseCircle className="h-3 w-3 inline mr-1" />Suspended</SelectItem>
                      <SelectItem value="rejected"><Ban className="h-3 w-3 inline mr-1" />Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="outline" onClick={() => setDetailsId(o.id)} className="border-zinc-600 text-white hover:bg-zinc-800 hover:text-white">
                    <Eye className="h-3 w-3 mr-1" />View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(o)} className="border-blue-600/60 bg-blue-950/40 text-blue-100 hover:bg-blue-900/60 hover:text-white">
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDeleteOrgState(o); setDeleteConfirm(""); }} className="border-red-700 bg-red-950/40 text-red-100 hover:bg-red-900/60 hover:text-white">
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-dashed border-zinc-700">
                  <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="text-zinc-400">Expires on:</span>
                    <span className={`font-semibold ${expired ? "text-red-400" : "text-white"}`}>
                      {expLabel}
                    </span>
                    {expired && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                  <DateInput
                    value={inputVal}
                    onChange={(e) => setExpiryEdits((p) => ({ ...p, [o.id]: e.target.value }))}
                    className="h-8 text-xs w-full sm:w-[150px] bg-zinc-900 border-zinc-700 text-white"
                    disabled={busy === o.id}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === o.id || !inputVal}
                    onClick={() => saveExpiry(o.id, new Date(inputVal).toISOString())}
                    className="border-zinc-600 text-white hover:bg-zinc-800"
                  >
                    <Save className="h-3 w-3 mr-1" />Set
                  </Button>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => saveExpiry(o.id, undefined, 30)} className="bg-zinc-700 text-white hover:bg-zinc-600">+30d</Button>
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => saveExpiry(o.id, undefined, 365)} className="bg-zinc-700 text-white hover:bg-zinc-600">+1yr</Button>
                    <Button size="sm" disabled={busy === o.id} onClick={() => openRenew(o)} className="bg-emerald-700 hover:bg-emerald-600 text-white">
                      <Receipt className="h-3 w-3 mr-1" />Renew
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReceiptsOrg(o)} className="border-amber-600/60 text-amber-100 hover:bg-amber-950/40">
                      <FileText className="h-3 w-3 mr-1" />Receipts
                    </Button>
                  </div>
                </div>
                </div>
                )}
              </div>
            );
          })}

          {!orgsQ.isLoading && filtered.length === 0 && (
            <div className="text-center text-xs text-zinc-400 py-4">No organizations.</div>
          )}
        </div>
      </Card>

      <Dialog open={!!detailsId} onOpenChange={(o) => !o && setDetailsId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-green-400" />
              {detailsQ.data?.org.name ?? "Organization Details"}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-zinc-400">
              {detailsQ.data?.org.org_code}
            </DialogDescription>
          </DialogHeader>

          {detailsQ.isLoading && <div className="text-center py-6 text-sm text-zinc-400">Loading…</div>}

          {detailsQ.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load organization members</AlertTitle>
              <AlertDescription>{detailsQ.error.message}</AlertDescription>
              <Button variant="outline" size="sm" onClick={() => detailsQ.refetch()}>Retry</Button>
            </Alert>
          )}

          {detailsQ.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-zinc-800 rounded" style={{ borderColor: "#3f3f46" }}>
                  <div className="text-xl font-bold text-white">{detailsQ.data.counts.total}</div>
                  <div className="text-[10px] uppercase text-zinc-400">Total</div>
                </div>
                <div className="p-2 bg-green-900/60 rounded" style={{ borderColor: "#3f3f46" }}>
                  <div className="text-xl font-bold text-green-200">{detailsQ.data.counts.approved}</div>
                  <div className="text-[10px] uppercase text-zinc-400">Approved</div>
                </div>
                <div className="p-2 bg-amber-900/60 rounded" style={{ borderColor: "#3f3f46" }}>
                  <div className="text-xl font-bold text-amber-200">{detailsQ.data.counts.pending}</div>
                  <div className="text-[10px] uppercase text-zinc-400">Pending</div>
                </div>
                <div className="p-2 bg-red-900/60 rounded" style={{ borderColor: "#3f3f46" }}>
                  <div className="text-xl font-bold text-red-200">{detailsQ.data.counts.rejected}</div>
                  <div className="text-[10px] uppercase text-zinc-400">Rejected</div>
                </div>
              </div>

              <OrganizationRegistrationDetails
                value={organizationFormFromRow(detailsQ.data.org)}
                document={(path) => <OrgDocThumb orgId={detailsQ.data.org.id} path={path} />}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-foreground">
                <div><dt className="text-muted-foreground">{L("Organization code", "సంస్థ కోడ్", "संस्था कोड")}</dt><dd>{detailsQ.data.org.org_code}</dd></div>
                <div><dt className="text-muted-foreground">{L("Letter code", "అక్షర కోడ్", "अक्षर कोड")}</dt><dd>{detailsQ.data.org.letter_code ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">{L("Registered on", "నమోదైన తేదీ", "पंजीकरण तिथि")}</dt><dd>{new Date(detailsQ.data.org.created_at).toLocaleString()}</dd></div>
                <div><dt className="text-muted-foreground">{L("Status", "స్థితి", "स्थिति")}</dt><dd>{detailsQ.data.org.approval_status}</dd></div>
                <div><dt className="text-muted-foreground">{L("Review notes", "సమీక్ష గమనికలు", "समीक्षा टिप्पणियाँ")}</dt><dd className="break-words">{detailsQ.data.org.approval_notes || "—"}</dd></div>
                <div><dt className="text-muted-foreground">{L("Subscription expires", "చందా ముగింపు", "सदस्यता समाप्ति")}</dt><dd>{detailsQ.data.org.subscription_expires_at ? new Date(detailsQ.data.org.subscription_expires_at).toLocaleDateString() : "—"}</dd></div>
              </dl>
              <Button variant="outline" onClick={() => { const org = detailsQ.data.org; setDetailsId(null); openEdit(org); }}><Pencil className="h-4 w-4 mr-2" />{L("Edit organization", "సంస్థ వివరాలు మార్చు", "संस्था का विवरण बदलें")}</Button>

              <div>
                <div className="font-semibold text-sm mb-2 flex items-center gap-1 text-white">
                  <Users className="h-4 w-4 text-zinc-400" /> Members ({detailsQ.data.members.length})
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded bg-zinc-900" style={{ borderColor: "#3f3f46" }}>
                  {detailsQ.data.members.length === 0 && (
                    <div className="text-xs text-zinc-400 text-center py-4">No members yet.</div>
                  )}
                  {detailsQ.data.members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 p-2 border-b last:border-0 text-xs" style={{ borderColor: "#3f3f46" }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate text-white">{m.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {m.member_code ?? "—"} · {m.email ?? m.phone ?? ""}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-semibold ${
                        m.status === "approved" ? "bg-green-900/60 text-green-200 border-green-700" :
                        m.status === "rejected" ? "bg-red-900/60 text-red-200 border-red-700" :
                        "bg-amber-900/60 text-amber-200 border-amber-700"
                      }`}>
                        {m.status}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {m.status !== "approved" && (
                          <Button
                            size="sm"
                            disabled={memberBusy === m.id}
                            onClick={() => reviewMember(m.id, "approve")}
                            className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                          </Button>
                        )}
                        {m.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={memberBusy === m.id}
                            onClick={() => reviewMember(m.id, "reject")}
                            className="h-6 px-2 text-[10px] border-zinc-600 bg-transparent text-white hover:bg-zinc-800"
                          >
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOrg} onOpenChange={(open) => { if (!open && busy !== editOrg?.id) setEditOrg(null); }}>
        <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" />{L("Edit Organization", "సంస్థ వివరాల సవరణ", "संस्था का विवरण संपादित करें")}</DialogTitle>
            <DialogDescription className="text-xs font-mono">{editOrg?.org_code}</DialogDescription>
          </DialogHeader>
          {editLoading ? <p>{L("Loading…", "లోడ్ అవుతోంది…", "लोड हो रहा है…")}</p> : editError ? <Alert variant="destructive"><AlertDescription>{editError}</AlertDescription><Button variant="outline" onClick={() => openEdit(editOrg)}>{L("Retry", "మళ్ళీ ప్రయత్నించు", "फिर से प्रयास करें")}</Button></Alert> : editOrg && <OrganizationRegistrationDetails value={editForm} onChange={setEditForm} disabled={busy === editOrg.id} document={(path) => <OrgDocThumb orgId={editOrg.id} path={path} />} />}
          <DialogFooter>
            <Button variant="ghost" disabled={busy === editOrg?.id} onClick={() => setEditOrg(null)}>{L("Cancel", "రద్దు", "रद्द करें")}</Button>
            <Button onClick={saveEdit} disabled={editLoading || !!editError || busy === editOrg?.id}><Save className="h-4 w-4 mr-1" />{L("Save Changes", "మార్పులు సేవ్ చేయండి", "बदलाव सहेजें")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteOrgState} onOpenChange={(o) => { if (!o) { setDeleteOrgState(null); setDeleteConfirm(""); } }}>
        <DialogContent className="max-w-md bg-zinc-900 border-red-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="h-5 w-5" /> Delete Organization
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              This permanently deletes <b className="text-white">{deleteOrgState?.name}</b> and ALL related data
              (members, loans, auctions, accounts, meetings, elections, chats). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="bg-red-950/40 border-red-800 text-red-100">
            <AlertTitle className="text-xs">Prefer to deactivate?</AlertTitle>
            <AlertDescription className="text-xs">
              Set the status to <b>Suspended</b> instead to disable the society while keeping its data safe.
            </AlertDescription>
          </Alert>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-300">
              Type org code <span className="font-mono text-red-300">{deleteOrgState?.org_code}</span> to confirm
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
              placeholder={deleteOrgState?.org_code}
              className="bg-zinc-950 border-red-700 text-white font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteOrgState(null); setDeleteConfirm(""); }} className="text-white hover:bg-zinc-800">Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy === deleteOrgState?.id || deleteConfirm.trim().toUpperCase() !== String(deleteOrgState?.org_code ?? "").toUpperCase()}
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuspendConfirmDialog
        org={suspendOrgState}
        open={!!suspendOrgState}
        confirmText={suspendConfirm}
        onConfirmTextChange={setSuspendConfirm}
        onConfirm={confirmSuspend}
        onOpenChange={(open: boolean) => { if (!open) { setSuspendOrgState(null); setSuspendConfirm(""); } }}
        busy={busy === suspendOrgState?.id}
      />

      {/* Renew subscription + create receipt */}
      <Dialog open={!!renewOrg} onOpenChange={(o) => !o && setRenewOrg(null)}>
        <DialogContent className="max-w-md bg-zinc-900 border-emerald-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-300">
              <Receipt className="h-5 w-5" /> Renew Subscription
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Record a payment for <b className="text-white">{renewOrg?.name}</b>. A PAID receipt PDF will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={renewForm.amount}
                onChange={(e) => setRenewForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 1200"
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Select value={renewForm.currency} onValueChange={(v) => setRenewForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="KWD">KWD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Extend (days)</Label>
              <Input
                type="number"
                value={renewForm.days}
                onChange={(e) => setRenewForm((p) => ({ ...p, days: e.target.value }))}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select value={renewForm.method} onValueChange={(v) => setRenewForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              rows={2}
              value={renewForm.notes}
              onChange={(e) => setRenewForm((p) => ({ ...p, notes: e.target.value }))}
              className="bg-zinc-950 border-zinc-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenewOrg(null)} className="text-white hover:bg-zinc-800">Cancel</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
              disabled={busy === renewOrg?.id}
              onClick={submitRenew}
            >
              <Receipt className="h-4 w-4 mr-1" /> Record & Generate Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipts list dialog */}
      <ReceiptsDialog org={receiptsOrg} onClose={() => setReceiptsOrg(null)} />
    </>
  );
}

function ReceiptsDialog({ org, onClose }: { org: any | null; onClose: () => void }) {
  const fetchReceipts = useServerFn(listOrgReceipts);
  const q = useQuery({
    queryKey: ["admin-org-receipts", org?.id],
    queryFn: () => fetchReceipts({ data: { org_id: org!.id } }),
    enabled: !!org?.id,
  });
  const receipts = (q.data?.receipts ?? []) as any[];
  const orgFull = q.data?.org ?? org;

  return (
    <Dialog open={!!org} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-amber-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <Receipt className="h-5 w-5" /> Receipts — {org?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 font-mono">
            {org?.org_code}
          </DialogDescription>
        </DialogHeader>
        {q.isLoading && <div className="py-6 text-center text-sm text-zinc-400">Loading…</div>}
        {!q.isLoading && receipts.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-500">No receipts recorded for this organization.</div>
        )}
        <div className="space-y-2">
          {receipts.map((r) => {
            const paid = new Date(r.paid_on).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const till = new Date(r.period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const symbol = r.currency === "INR" ? "Rs." : String(r.currency || "").toUpperCase();
            return (
              <div key={r.id} className="p-3 rounded-lg border border-zinc-700 bg-zinc-800/60 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-amber-300">{r.receipt_number}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Paid {paid} · Valid till {till} · {(r.payment_method || "other").toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{symbol} {Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-[10px] uppercase text-emerald-300 font-semibold">{(r.status || "paid").toUpperCase()}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600/60 text-amber-100 hover:bg-amber-950/40"
                  onClick={() => printReceipt(orgFull, r)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuspendConfirmDialog({
  org,
  open,
  confirmText,
  onConfirmTextChange,
  onConfirm,
  onOpenChange,
  busy,
}: {
  org: any | null;
  open: boolean;
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-900 border-amber-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <PauseCircle className="h-5 w-5" /> Suspend Organization
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            This deactivates <b className="text-white">{org?.name}</b>. Members will lose access, but all data is preserved. You can reactivate anytime.
          </DialogDescription>
        </DialogHeader>
        <Alert className="bg-amber-950/40 border-amber-800 text-amber-100">
          <AlertTitle className="text-xs">Data is safe</AlertTitle>
          <AlertDescription className="text-xs">
            Suspending only changes the status. No records are deleted.
          </AlertDescription>
        </Alert>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-300">
            Type org code <span className="font-mono text-amber-300">{org?.org_code}</span> to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value.toUpperCase())}
            placeholder={org?.org_code}
            className="bg-zinc-950 border-amber-700 text-white font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-zinc-800">Cancel</Button>
          <Button
            className="bg-amber-700 hover:bg-amber-800 text-white"
            disabled={busy || confirmText.trim().toUpperCase() !== String(org?.org_code ?? "").toUpperCase()}
            onClick={onConfirm}
          >
            <PauseCircle className="h-4 w-4 mr-1" />Suspend Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GlobalAd = { id: string; url: string; label: string | null; active: boolean; sort_order: number };

function MbrGlobalAdsManager() {
  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ["mbr-global-ads-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mbr_global_ads" as any)
        .select("id,url,label,active,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data as unknown) || []) as GlobalAd[];
    },
  });

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const ads = listQ.data || [];

  useEffect(() => {
    let cancel = false;
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(ads.map(async (a) => {
        if (!a.url) return;
        if (/^https?:\/\//i.test(a.url) || a.url.startsWith("data:")) { map[a.url] = a.url; return; }
        const { data } = await supabase.storage.from("mbr-global-ads").createSignedUrl(a.url, 3600);
        if (data?.signedUrl) map[a.url] = data.signedUrl;
      }));
      if (!cancel) setPreviews(map);
    })();
    return () => { cancel = true; };
  }, [JSON.stringify(ads.map((a) => a.url))]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `global/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("mbr-global-ads").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error(up.error.message);
        const ins = await supabase.from("mbr_global_ads" as any).insert({ url: path, active: true, sort_order: ads.length });
        if (ins.error) throw new Error(ins.error.message);
      }
      toast.success("Uploaded / అప్‌లోడ్ అయింది");
      qc.invalidateQueries({ queryKey: ["mbr-global-ads-admin"] });
      qc.invalidateQueries({ queryKey: ["mbr-global-ads-active"] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(a: GlobalAd) {
    const { error } = await supabase.from("mbr_global_ads" as any).update({ active: !a.active }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["mbr-global-ads-admin"] });
    qc.invalidateQueries({ queryKey: ["mbr-global-ads-active"] });
  }

  async function remove(a: GlobalAd) {
    if (!confirm("Delete this banner?")) return;
    if (a.url && !/^https?:\/\//i.test(a.url) && !a.url.startsWith("data:")) {
      await supabase.storage.from("mbr-global-ads").remove([a.url]).catch(() => {});
    }
    const { error } = await supabase.from("mbr_global_ads" as any).delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["mbr-global-ads-admin"] });
    qc.invalidateQueries({ queryKey: ["mbr-global-ads-active"] });
  }

  return (
    <Card className="p-4 bg-zinc-900/95 border-zinc-700 text-white shadow-md space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-[#ff8c28]" />
        <h2 className="font-bold text-white">MBR APP Global Ad Banners (Super Admin only)</h2>
      </div>
      <p className="text-xs text-zinc-400">
        ఈ ప్రకటనలు అన్ని సొసైటీల సభ్యుల డాష్‌బోర్డ్ కింద sticky bar లో కనిపిస్తాయి. Society admins దీన్ని edit చేయలేరు.
      </p>
      <div className="rounded-md border border-dashed border-[#ff8c28]/60 bg-[#ff8c28]/10 p-2 text-[11px] text-[#ff8c28]">
        Recommended: <span className="font-mono">1200 × 128 px</span> (ratio ~9:1) — slim horizontal banner, max height 64px on mobile. JPG/PNG, &lt; 500KB.
      </div>

      <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 bg-zinc-900 py-4 cursor-pointer hover:border-[#ff8c28] transition">
        <ImageIcon className="h-4 w-4 text-[#ff8c28]" />
        <span className="text-sm text-white">{uploading ? "Uploading…" : "Upload global banner image(s)"}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {ads.length === 0 ? (
        <p className="text-xs text-zinc-400 italic text-center py-2">No global banners yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ads.map((a) => {
            const src = previews[a.url] || "";
            return (
              <div key={a.id} className="rounded-lg overflow-hidden border relative"
                style={{ borderColor: a.active ? "#ff8c28" : "#3f3f46", opacity: a.active ? 1 : 0.55 }}>
                {src
                  ? <img
                      src={src}
                      alt=""
                      className="w-full h-16 object-cover bg-zinc-800"
                      onError={async (e) => {
                        const img = e.currentTarget;
                        if (img.dataset.retried) return;
                        img.dataset.retried = "1";
                        const { data } = await supabase.storage.from("mbr-global-ads").createSignedUrl(a.url, 3600);
                        if (data?.signedUrl) img.src = data.signedUrl;
                      }}
                    />
                  : <div className="w-full h-16 bg-zinc-800 animate-pulse" />}

                <div className="flex items-center justify-between p-1.5 bg-zinc-900 border-t" style={{ borderColor: "#3f3f46" }}>
                  <button type="button" onClick={() => toggleActive(a)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:text-zinc-300">
                    {a.active ? <><Eye className="h-3.5 w-3.5" /> Active</> : <><Ban className="h-3.5 w-3.5" /> Hidden</>}
                  </button>
                  <button type="button" onClick={() => remove(a)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300">
                    <XCircle className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

