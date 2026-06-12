import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyMembership } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/member/pending")({
  head: () => ({ meta: [{ title: "Member Status — MBR App" }] }),
  component: Pending,
});

function Pending() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyMembership);
  const meQ = useQuery({ queryKey: ["my-membership"], queryFn: () => fetchMe(), refetchInterval: 15000 });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (meQ.isLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  const m = meQ.data?.membership;

  if (!m) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 text-center space-y-3">
          <p>మీరు ఇంకా ఏ Org కి join అవ్వలేదు.</p>
          <Button onClick={() => navigate({ to: "/member/register" })}>Join Org</Button>
        </Card>
      </div>
    );
  }

  const status = m.status;
  const StatusIcon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
  const color = status === "approved" ? "text-green-600" : status === "rejected" ? "text-destructive" : "text-amber-600";
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
  const msg = status === "approved"
    ? "మీ request approve అయ్యింది! Welcome."
    : status === "rejected"
    ? "మీ request reject అయ్యింది."
    : "మీ request Admin review లో ఉంది. దయచేసి వేచి ఉండండి.";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{m.name}</h1>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
        </header>
        <Card className="p-6 text-center space-y-4">
          <StatusIcon className={`h-16 w-16 mx-auto ${color}`} />
          <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>{label}</Badge>
          <h2 className="text-lg font-semibold">{(m as any).organizations?.name}</h2>
          <p className="text-sm text-muted-foreground">{msg}</p>
        </Card>
      </div>
    </div>
  );
}
