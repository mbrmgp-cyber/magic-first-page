import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyOrg } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Users, Briefcase, Calendar, IdCard, Wallet, MessageSquare, QrCode } from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Society Dashboard — MBR App" }] }),
  component: Dashboard,
});

const MENU = [
  { to: "/org/rules", label: "సొసైటీ రూల్స్ & హిస్టరీ", icon: BookOpen },
  { to: "/org/members", label: "సభ్యుల వివరాలు & నమోదు", icon: Users },
  { to: "/org/committee", label: "కార్యవర్గ కమిటీ వివరాలు", icon: Briefcase },
  { to: "/org/events", label: "కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు", icon: Calendar },
  { to: "/org/designs", label: "ID కార్డులు, మెమెంటోలు, లెటర్‌ప్యాడ్, స్టాంప్ డిజైన్", icon: IdCard },
  { to: "/org/accounts", label: "అకౌంట్స్", icon: Wallet },
  { to: "/org/chat", label: "సభ్యులతో చాటింగ్", icon: MessageSquare },
] as const;

function Dashboard() {
  const navigate = useNavigate();
  const fetchOrg = useServerFn(getMyOrg);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (orgQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-tricolor">Loading…</div>;

  const org = orgQ.data?.org;
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="p-6 text-center space-y-3 bg-white/90 backdrop-blur-xl">
          <p>మీకు Organization లేదు.</p>
          <Button onClick={() => navigate({ to: "/org/register" })}>Register Org</Button>
        </Card>
      </div>
    );
  }

  const govQr = (org as any).gov_qr_url as string | undefined;

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top bar: gov QR (left) + MBR logo (right) */}
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-md bg-white/90 backdrop-blur shadow border border-white flex items-center justify-center overflow-hidden">
            {govQr ? (
              <img src={govQr} alt="Gov Reg QR" className="w-full h-full object-contain" />
            ) : (
              <QrCode className="w-7 h-7 text-muted-foreground" aria-label="Gov QR placeholder" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={logout} className="text-foreground">
              <LogOut className="h-4 w-4 mr-1" />Logout
            </Button>
            <img src={mbrLogo.url} alt="MBR" className="w-12 h-12 rounded-md bg-white/90 backdrop-blur shadow border border-white object-contain p-1" />
          </div>
        </div>

        {/* Society headline card */}
        <Card className="p-5 bg-white/92 backdrop-blur-xl shadow-2xl border-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 shrink-0 rounded-full bg-white shadow border-2 border-[#FF9933] flex items-center justify-center overflow-hidden">
              {org.logo_url ? (
                <img src={org.logo_url} alt={`${org.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold" style={{
                  background: "linear-gradient(90deg,#FF9933,#138808)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>{org.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold leading-tight break-words">{org.name}</h1>
              {org.slogan && (
                <p className="text-sm italic mt-0.5" style={{
                  background: "linear-gradient(90deg,#FF9933,#138808)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>"{org.slogan}"</p>
              )}
              {org.gov_reg_number && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">Reg No : {org.gov_reg_number}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Menu grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to}>
              <Card className="p-4 bg-white/92 backdrop-blur hover:bg-white hover:shadow-lg transition-all border-white cursor-pointer h-full">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#FF9933,#138808)" }}>
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-sm leading-tight">{m.label}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">Org Code: <span className="font-mono">{org.org_code}</span></p>
      </div>
    </div>
  );
}
