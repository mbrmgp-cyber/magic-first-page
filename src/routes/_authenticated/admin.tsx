import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyRoles, claimMbrAdmin, listAllOrgsForAdmin, reviewOrganization, adminSearchMembers, adminUpdateMemberCode } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, XCircle, Clock, LogOut, Image as ImageIcon, FileText, Users, IdCard, Search, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
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
