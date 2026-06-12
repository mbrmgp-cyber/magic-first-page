import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrg, regenerateOrgQr, listOrgMembers, reviewMember } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Download, RefreshCw, LogOut, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Org Dashboard — MBR App" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const fetchMembers = useServerFn(listOrgMembers);
  const regen = useServerFn(regenerateOrgQr);
  const review = useServerFn(reviewMember);

  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const membersQ = useQuery({ queryKey: ["org-members"], queryFn: () => fetchMembers() });

  const regenMut = useMutation({
    mutationFn: () => regen(),
    onSuccess: () => {
      toast.success("కొత్త QR generate అయ్యింది");
      qc.invalidateQueries({ queryKey: ["my-org"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const reviewMut = useMutation({
    mutationFn: (v: { member_id: string; action: "approve" | "reject" }) => review({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.action === "approve" ? "Approved" : "Rejected");
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (orgQ.isLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const org = orgQ.data?.org;
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 text-center space-y-3">
          <p>మీకు Organization లేదు.</p>
          <Button onClick={() => navigate({ to: "/org/register" })}>Register Org</Button>
        </Card>
      </div>
    );
  }

  const members = membersQ.data?.members ?? [];
  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">{org.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
        </header>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Organization QR Code</h2>
            <Badge variant="outline" className="font-mono">{org.org_code}</Badge>
          </div>
          {orgQ.data?.qrDataUrl && (
            <div className="flex justify-center">
              <img src={orgQ.data.qrDataUrl} alt="QR" className="w-56 h-56 border rounded-lg" />
            </div>
          )}
          <div className="flex gap-2">
            {orgQ.data?.qrDataUrl && (
              <a href={orgQ.data.qrDataUrl} download={`${org.org_code}.png`} className="flex-1">
                <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" />Download</Button>
              </a>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" className="flex-1" disabled={regenMut.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenMut.isPending ? "animate-spin" : ""}`} />Regenerate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>QR Regenerate చేయాలా?</AlertDialogTitle>
                  <AlertDialogDescription>
                    పాత QR Code invalid అవుతుంది. ఇప్పుడు పంచిన QR ఎవ్వరూ ఉపయోగించలేరు.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => regenMut.mutate()}>Regenerate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Pending Requests ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">పెండింగ్ requests లేవు.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewMut.mutate({ member_id: m.id, action: "approve" })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ member_id: m.id, action: "reject" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Approved Members ({approved.length})</h2>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">ఇంకా approved members లేరు.</p>
          ) : (
            <ul className="space-y-2">
              {approved.map((m) => (
                <li key={m.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <Badge>Approved</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
