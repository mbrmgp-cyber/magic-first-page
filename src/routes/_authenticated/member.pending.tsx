import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyMembership } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberIdCard } from "@/components/MemberIdCard";
import { LogOut, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useI18n, bi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/member/pending")({
  head: () => ({ meta: [{ title: "Member Status — MBR App" }] }),
  component: Pending,
});

function Pending() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const b = (te: string, en: string) => bi(te, en, lang);
  const fetchMe = useServerFn(getMyMembership);
  const meQ = useQuery({ queryKey: ["my-membership"], queryFn: () => fetchMe(), refetchInterval: 15000 });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (meQ.isLoading) return <div className="min-h-screen flex items-center justify-center">{b("లోడ్ అవుతోంది…", "Loading…")}</div>;
  const m = meQ.data?.membership;

  if (m && m.status === "approved") {
    if (typeof window !== "undefined") navigate({ to: "/member/dashboard", replace: true });
    return null;
  }

  if (!m) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" translate="no">
        <Card className="p-6 text-center space-y-3">
          <p>{b("మీరు ఇంకా ఏ సంస్థలో చేరలేదు.", "You have not joined any organization yet.")}</p>
          <Button onClick={() => navigate({ to: "/member/register" })}>{b("సంస్థలో చేరండి", "Join Org")}</Button>
        </Card>
      </div>
    );
  }

  const status = m.status;
  const StatusIcon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
  const color = status === "approved" ? "text-green-600" : status === "rejected" ? "text-destructive" : "text-amber-600";
  const label = status === "approved" ? b("ఆమోదించబడింది", "Approved") : status === "rejected" ? b("తిరస్కరించబడింది", "Rejected") : b("పెండింగ్", "Pending");
  const msg = status === "approved"
    ? b("మీ అభ్యర్థన ఆమోదించబడింది! స్వాగతం.", "Your request has been approved! Welcome.")
    : status === "rejected"
    ? b("మీ అభ్యర్థన తిరస్కరించబడింది.", "Your request has been rejected.")
    : b("మీ అభ్యర్థన అడ్మిన్ సమీక్షలో ఉంది. దయచేసి వేచి ఉండండి.", "Your request is under admin review. Please wait.");

  return (
    <div className="min-h-screen bg-background p-6" translate="no">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{m.name}</h1>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-2" />{b("లాగ్ అవుట్", "Logout")}</Button>
        </header>
        <Card className="p-6 text-center space-y-4">
          <StatusIcon className={`h-16 w-16 mx-auto ${color}`} />
          <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>{label}</Badge>
          <h2 className="text-lg font-semibold">{(m as any).organizations?.name}</h2>
          <p className="text-sm text-muted-foreground">{msg}</p>
        </Card>
        {status === "approved" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground text-center">{b("మీ ID కార్డ్", "Your ID Card")}</h3>
            <MemberIdCard member={m as any} org={(m as any).organizations ?? null} />
          </div>
        )}
      </div>
    </div>
  );
}

