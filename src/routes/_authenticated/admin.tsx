import { DateInput } from "@/components/DateInput";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyRoles, claimMbrAdmin, listAllOrgsForAdmin, reviewOrganization, adminSearchMembers, adminUpdateMemberCode, setOrganizationStatus, getOrganizationDetails, setOrgSubscription } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, XCircle, Clock, LogOut, Image as ImageIcon, FileText, Users, IdCard, Search, Save, Building2, Eye, Ban, PlayCircle, PauseCircle, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "MBR Admin Panel" }] }),
  component: AdminPanel,
});

function AdminPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const claim = useServerFn(claimMbrAdmin);
  const fetchOrgs = useServerFn(listAllOrgsForAdmin);
  const review = useServerFn(reviewOrganization);

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

  if (rolesQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-tricolor">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="w-full max-w-md p-6 text-center space-y-4 bg-white/92 backdrop-blur-xl shadow-2xl border-white">
          <img src={mbrLogo.url} alt="MBR" className="w-16 h-16 mx-auto rounded-md bg-black p-1.5" />
          <h1 className="text-xl font-bold">MBR Admin Bootstrap</h1>
          <p className="text-sm text-muted-foreground">
            ఇంకా MBR Admin assign కాలేదు. మీరు మొదటిగా admin role తీసుకోవచ్చు. Claim చేసిన తర్వాత ఇతరులు ఈ button ద్వారా claim చేయలేరు.
          </p>
          <Button onClick={onClaim} className="w-full">
            <ShieldCheck className="h-4 w-4 mr-2" />నేను MBR Admin అవుతాను
          </Button>
          <Button onClick={logout} variant="ghost" size="sm" className="w-full">
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
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={mbrLogo.url} alt="MBR" className="w-12 h-12 rounded-md bg-black p-1" />
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-700" /> MBR Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Society approvals</p>
            </div>
          </div>
          <Button onClick={logout} variant="ghost" size="sm"><LogOut className="h-4 w-4 mr-1" />Logout</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`p-3 rounded-lg border text-left transition ${filter === f ? "bg-white shadow-md border-[#FF9933]" : "bg-white/70 border-white"}`}
            >
              <div className="text-xs uppercase text-muted-foreground">{f}</div>
              <div className="text-xl font-bold">
                {f === "all" ? orgs.length : counts[f as keyof typeof counts]}
              </div>
            </button>
          ))}
        </div>

        <MemberIdUpdater />

        <MbrGlobalAdsManager />

        <AllOrganizationsManager />





        {orgsQ.isLoading && <Card className="p-6 text-center bg-white/90">Loading societies…</Card>}

        {!orgsQ.isLoading && filtered.length === 0 && (
          <Card className="p-6 text-center bg-white/90 text-muted-foreground">
            {filter === "pending" ? "Pending applications లేవు 🎉" : "ఈ filter లో societies లేవు"}
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((o) => {
            const founders = Array.isArray(o.founders) ? (o.founders as any[]) : [];
            const statusColor =
              o.approval_status === "approved" ? "bg-green-100 text-green-800 border-green-300" :
              o.approval_status === "rejected" ? "bg-red-100 text-red-800 border-red-300" :
              "bg-amber-100 text-amber-800 border-amber-300";
            return (
              <Card key={o.id} className="p-4 bg-white/95 backdrop-blur border-white shadow-md space-y-3">
                <div className="flex items-start gap-3">
                  {o.logo_url ? (
                    <img src={o.logo_url} alt="" className="w-16 h-16 rounded-md border object-cover bg-white shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{o.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${statusColor}`}>
                        {o.approval_status}
                      </span>
                    </div>
                    {o.slogan && <p className="text-xs italic text-muted-foreground">"{o.slogan}"</p>}
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>📧 {o.email}</div>
                      {o.phone && <div>📞 {o.phone}</div>}
                      {o.gov_reg_number && <div className="font-mono">Reg No: {o.gov_reg_number}</div>}
                      <div className="font-mono text-[10px]">Code: {o.org_code}</div>
                    </div>
                  </div>
                </div>

                {founders.length > 0 && (
                  <div className="border-t pt-2">
                    <div className="text-xs font-semibold flex items-center gap-1 mb-2"><Users className="h-3 w-3" /> Founders ({founders.length})</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {founders.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-muted/40 rounded text-xs">
                          {f.aadhaar_url ? (
                            <a href={f.aadhaar_url} target="_blank" rel="noopener" className="shrink-0">
                              <img src={f.aadhaar_url} alt="ID" className="w-12 h-12 rounded border object-cover hover:scale-110 transition" />
                            </a>
                          ) : (
                            <div className="w-12 h-12 rounded border bg-background flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{f.name || "—"}</div>
                            {f.address && <div className="text-muted-foreground text-[10px] truncate">{f.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {o.approval_status === "rejected" && o.approval_notes && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTitle className="text-xs">Rejection reason</AlertTitle>
                    <AlertDescription className="text-xs">{o.approval_notes}</AlertDescription>
                  </Alert>
                )}

                {o.approval_status === "pending" && (
                  <div className="border-t pt-3 space-y-2">
                    <Textarea
                      placeholder="Notes / reason (rejection కి compulsory)"
                      rows={2}
                      value={notes[o.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                      className="text-sm"
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
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 border-t pt-2">
                    <Clock className="h-3 w-3" />
                    {o.approved_at ? new Date(o.approved_at).toLocaleString() : "—"}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
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
    <Card className="p-4 bg-white/95 backdrop-blur border-white shadow-md space-y-3">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-[#FF9933]" />
        <h2 className="font-bold">Member ID Update (Super Admin)</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ఏ సొసైటీ లోనైనా సభ్యుని ID నెంబరును మార్చండి. Name / ID / Email / Phone తో వెతకండి.
      </p>
      <form onSubmit={doSearch} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, email, phone…" />
        <Button type="submit" disabled={loading || !q.trim()}>
          <Search className="h-4 w-4 mr-1" />{loading ? "…" : "Search"}
        </Button>
      </form>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 border rounded bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{m.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {(m.organizations as any)?.name ?? "—"} · {m.email ?? ""} {m.phone ? `· ${m.phone}` : ""}
                </div>
              </div>
              <Input
                className="w-36 font-mono text-sm"
                value={edits[m.id] ?? ""}
                onChange={(e) => setEdits((x) => ({ ...x, [m.id]: e.target.value.toUpperCase() }))}
              />
              <Button size="sm" disabled={busy === m.id || !edits[m.id]?.trim() || edits[m.id] === m.member_code} onClick={() => save(m)}>
                <Save className="h-4 w-4 mr-1" />Save
              </Button>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && q && (
        <div className="text-xs text-muted-foreground">No results yet — try Search.</div>
      )}
    </Card>
  );
}

type OrgStatus = "pending" | "approved" | "rejected" | "suspended";

const STATUS_STYLES: Record<OrgStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  suspended: "bg-zinc-200 text-zinc-800 border-zinc-400",
};

const STATUS_LABEL: Record<OrgStatus, string> = {
  pending: "Pending",
  approved: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

function AllOrganizationsManager() {
  const qc = useQueryClient();
  const fetchOrgs = useServerFn(listAllOrgsForAdmin);
  const setStatus = useServerFn(setOrganizationStatus);
  const getDetails = useServerFn(getOrganizationDetails);
  const setSub = useServerFn(setOrgSubscription);

  const orgsQ = useQuery({ queryKey: ["admin-all-orgs"], queryFn: () => fetchOrgs() });
  const [busy, setBusy] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expiryEdits, setExpiryEdits] = useState<Record<string, string>>({});

  const detailsQ = useQuery({
    queryKey: ["admin-org-details", detailsId],
    queryFn: () => getDetails({ data: { org_id: detailsId! } }),
    enabled: !!detailsId,
  });

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
      await setSub({ data: { org_id: orgId, expires_at, extend_days } });
      toast.success("Subscription updated");
      setExpiryEdits((p) => ({ ...p, [orgId]: "" }));
      qc.invalidateQueries({ queryKey: ["admin-all-orgs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(null);
    }
  }


  const orgs = (orgsQ.data?.orgs ?? []) as any[];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? orgs.filter((o) =>
        [o.name, o.email, o.phone, o.org_code, o.gov_reg_number]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(q)),
      )
    : orgs;

  return (
    <>
      <Card className="p-4 bg-white/95 backdrop-blur border-white shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#138808]" />
          <h2 className="font-bold">All Organizations ({orgs.length})</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          సొసైటీని Active / Suspended / Rejected గా మార్చండి. వివరాలు చూడడానికి View నొక్కండి.
        </p>
        <Input
          placeholder="Search by name, code, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {orgsQ.isLoading && <div className="text-sm text-muted-foreground text-center py-4">Loading…</div>}

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
            return (
              <div key={o.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {o.logo_url ? (
                      <img src={o.logo_url} alt="" className="w-10 h-10 rounded border object-cover bg-white shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-background flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{o.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate font-mono">
                        {o.org_code} · {o.email ?? "—"}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${STATUS_STYLES[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>

                  <Select
                    value={status}
                    onValueChange={(v) => changeStatus(o.id, v as OrgStatus)}
                    disabled={busy === o.id}
                  >
                    <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending"><Clock className="h-3 w-3 inline mr-1" />Pending</SelectItem>
                      <SelectItem value="approved"><PlayCircle className="h-3 w-3 inline mr-1" />Active</SelectItem>
                      <SelectItem value="suspended"><PauseCircle className="h-3 w-3 inline mr-1" />Suspended</SelectItem>
                      <SelectItem value="rejected"><Ban className="h-3 w-3 inline mr-1" />Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="outline" onClick={() => setDetailsId(o.id)}>
                    <Eye className="h-3 w-3 mr-1" />View
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-dashed">
                  <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-muted-foreground">Expires on:</span>
                    <span className={`font-semibold ${expired ? "text-destructive" : "text-foreground"}`}>
                      {expLabel}
                    </span>
                    {expired && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                  <DateInput
                    value={inputVal}
                    onChange={(e) => setExpiryEdits((p) => ({ ...p, [o.id]: e.target.value }))}
                    className="h-8 text-xs w-full sm:w-[150px]"
                    disabled={busy === o.id}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === o.id || !inputVal}
                    onClick={() => saveExpiry(o.id, new Date(inputVal).toISOString())}
                  >
                    <Save className="h-3 w-3 mr-1" />Set
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => saveExpiry(o.id, undefined, 30)}>+30d</Button>
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => saveExpiry(o.id, undefined, 365)}>+1yr</Button>
                  </div>
                </div>
              </div>
            );
          })}

          {!orgsQ.isLoading && filtered.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">No organizations.</div>
          )}
        </div>
      </Card>

      <Dialog open={!!detailsId} onOpenChange={(o) => !o && setDetailsId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {detailsQ.data?.org.name ?? "Organization Details"}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {detailsQ.data?.org.org_code}
            </DialogDescription>
          </DialogHeader>

          {detailsQ.isLoading && <div className="text-center py-6 text-sm">Loading…</div>}

          {detailsQ.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-muted rounded">
                  <div className="text-xl font-bold">{detailsQ.data.counts.total}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">Total</div>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-xl font-bold text-green-700">{detailsQ.data.counts.approved}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">Approved</div>
                </div>
                <div className="p-2 bg-amber-50 rounded">
                  <div className="text-xl font-bold text-amber-700">{detailsQ.data.counts.pending}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">Pending</div>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-xl font-bold text-red-700">{detailsQ.data.counts.rejected}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">Rejected</div>
                </div>
              </div>

              <div className="text-xs space-y-1 border rounded p-3 bg-muted/30">
                <div><b>Email:</b> {detailsQ.data.org.email ?? "—"}</div>
                <div><b>Phone:</b> {detailsQ.data.org.phone ?? "—"}</div>
                {detailsQ.data.org.gov_reg_number && <div><b>Reg No:</b> {detailsQ.data.org.gov_reg_number}</div>}
                {detailsQ.data.org.slogan && <div><b>Slogan:</b> {detailsQ.data.org.slogan}</div>}
                {(detailsQ.data.org as any).address && <div><b>Address:</b> {(detailsQ.data.org as any).address}</div>}
                <div><b>Created:</b> {new Date(detailsQ.data.org.created_at).toLocaleDateString("en-GB")}</div>
                <div>
                  <b>Status:</b>{" "}
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase ${STATUS_STYLES[(detailsQ.data.org.approval_status ?? "pending") as OrgStatus]}`}>
                    {STATUS_LABEL[(detailsQ.data.org.approval_status ?? "pending") as OrgStatus]}
                  </span>
                </div>
              </div>

              <div>
                <div className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Users className="h-4 w-4" /> Members ({detailsQ.data.members.length})
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded">
                  {detailsQ.data.members.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">No members yet.</div>
                  )}
                  {detailsQ.data.members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 p-2 border-b last:border-0 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {m.member_code ?? "—"} · {m.email ?? m.phone ?? ""}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-semibold ${
                        m.status === "approved" ? "bg-green-100 text-green-800 border-green-300" :
                        m.status === "rejected" ? "bg-red-100 text-red-800 border-red-300" :
                        "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
    <Card className="p-4 bg-white/95 backdrop-blur border-white shadow-md space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-[#FF9933]" />
        <h2 className="font-bold">MBR APP Global Ad Banners (Super Admin only)</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ఈ ప్రకటనలు అన్ని సొసైటీల సభ్యుల డాష్‌బోర్డ్ కింద sticky bar లో కనిపిస్తాయి. Society admins దీన్ని edit చేయలేరు.
      </p>
      <div className="rounded-md border border-dashed border-orange-300 bg-orange-50 p-2 text-[11px] text-orange-900">
        Recommended: <span className="font-mono">1200 × 128 px</span> (ratio ~9:1) — slim horizontal banner, max height 64px on mobile. JPG/PNG, &lt; 500KB.
      </div>

      <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white py-4 cursor-pointer hover:border-[#FF9933] transition">
        <ImageIcon className="h-4 w-4 text-[#FF9933]" />
        <span className="text-sm">{uploading ? "Uploading…" : "Upload global banner image(s)"}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {ads.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">No global banners yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ads.map((a) => {
            const src = previews[a.url] || "";
            return (
              <div key={a.id} className="rounded-lg overflow-hidden border relative"
                style={{ borderColor: a.active ? "#FF993388" : "#d4d4d8", opacity: a.active ? 1 : 0.55 }}>
                {src
                  ? <img src={src} alt="" className="w-full h-16 object-cover" />
                  : <div className="w-full h-16 bg-zinc-100 animate-pulse" />}
                <div className="flex items-center justify-between p-1.5 bg-white/95 border-t">
                  <button type="button" onClick={() => toggleActive(a)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 hover:text-zinc-900">
                    {a.active ? <><Eye className="h-3.5 w-3.5" /> Active</> : <><Ban className="h-3.5 w-3.5" /> Hidden</>}
                  </button>
                  <button type="button" onClick={() => remove(a)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700">
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

