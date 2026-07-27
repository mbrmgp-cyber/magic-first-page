import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyRoles } from "@/lib/org.functions";
import { adminListVaradhiProfiles, adminReviewVaradhiProfile } from "@/lib/varadhi.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/varadhi")({
  head: () => ({ meta: [{ title: "Varadhi Admin — Approvals" }] }),
  component: VaradhiAdmin,
});

function VaradhiAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchRoles = useServerFn(getMyRoles);
  const fetchProfiles = useServerFn(adminListVaradhiProfiles);
  const review = useServerFn(adminReviewVaradhiProfile);

  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const isAdmin = rolesQ.data?.roles.includes("mbr_admin") ?? false;

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-varadhi", filter],
    queryFn: () => fetchProfiles({ data: { status: filter } }),
    enabled: isAdmin,
  });

  async function act(userId: string, action: "approve" | "reject") {
    setBusy(userId);
    try {
      await review({ data: { user_id: userId, action, notes: notes[userId] } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      qc.invalidateQueries({ queryKey: ["admin-varadhi"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (rolesQ.isLoading) return <div className="p-8 text-center">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="p-6 space-y-3 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p>You need MBR Admin (Super Admin) access to view this page.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>Go to Admin Panel</Button>
        </Card>
      </div>
    );
  }

  const rows = listQ.data?.profiles ?? [];
  const filters: Array<{ k: typeof filter; label: string }> = [
    { k: "pending", label: "Pending" },
    { k: "approved", label: "Approved" },
    { k: "rejected", label: "Rejected" },
    { k: "all", label: "All" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <h1 className="text-xl font-bold">Varadhi — Registrations</h1>
          </div>
          <Link to="/varadhi" className="text-sm text-primary underline">Open Varadhi</Link>
        </header>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.k}
              size="sm"
              variant={filter === f.k ? "default" : "outline"}
              onClick={() => setFilter(f.k)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {listQ.isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No registrations in this filter.</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => {
              const status = r.verification_status as string;
              const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
              const color =
                status === "approved" ? "text-green-600" : status === "rejected" ? "text-destructive" : "text-amber-600";
              return (
                <Card key={r.user_id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {r.photo_signed_url ? (
                      <img src={r.photo_signed_url} alt="" className="h-16 w-16 rounded-full object-cover border" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                        {r.full_name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{r.full_name}</h3>
                        <Badge variant="outline" className={color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {status}
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
                        {r.experience_years != null && <div>⏳ {r.experience_years} yrs experience</div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.aadhaar_signed_url && (
                      <a href={r.aadhaar_signed_url} target="_blank" rel="noreferrer" className="underline text-primary inline-flex items-center gap-1">
                        Aadhaar <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {r.license_signed_url && (
                      <a href={r.license_signed_url} target="_blank" rel="noreferrer" className="underline text-primary inline-flex items-center gap-1">
                        License <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {r.store_photo_signed_url && (
                      <a href={r.store_photo_signed_url} target="_blank" rel="noreferrer" className="underline text-primary inline-flex items-center gap-1">
                        Store <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {r.vehicle_photo_signed_url && (
                      <a href={r.vehicle_photo_signed_url} target="_blank" rel="noreferrer" className="underline text-primary inline-flex items-center gap-1">
                        Vehicle <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {status === "pending" && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Notes (optional)"
                        value={notes[r.user_id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.user_id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => act(r.user_id, "approve")} disabled={busy === r.user_id}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => act(r.user_id, "reject")} disabled={busy === r.user_id}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
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
      </div>
    </div>
  );
}
