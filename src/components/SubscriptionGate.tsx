import { useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMySubscriptionStatus, getMyRoles } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogOut } from "lucide-react";
import type { ReactNode } from "react";

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getMySubscriptionStatus);
  const fetchRoles = useServerFn(getMyRoles);

  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles(),
    staleTime: 60_000,
  });
  const isAdmin = rolesQ.data?.roles?.includes("mbr_admin") ?? false;

  // Always allow /admin (Super Admin panel) and /auth
  const path = location.pathname;
  const bypass = isAdmin || path.startsWith("/admin") || path.startsWith("/auth");

  const subQ = useQuery({
    queryKey: ["my-subscription-status"],
    queryFn: () => fetchStatus(),
    enabled: !bypass,
    staleTime: 60_000,
  });

  if (bypass) return <>{children}</>;
  if (subQ.isLoading || !subQ.data) return <>{children}</>;
  if (!subQ.data.has_org || !subQ.data.expired) return <>{children}</>;

  const expDate = subQ.data.expires_at
    ? new Date(subQ.data.expires_at as string).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-4 border-2 border-destructive/40 shadow-xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-destructive">Subscription Expired</h1>
        <p className="text-sm">
          Your subscription has expired. Please contact MBR App Super Admin to renew.
        </p>
        <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/40">
          <div><b>Organization:</b> {subQ.data.org_name ?? "—"}</div>
          <div><b>Expired on:</b> {expDate}</div>
        </div>
        <div className="text-xs">
          📧 <a className="underline" href="mailto:mbrplatform@gmail.com">mbrplatform@gmail.com</a>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="w-full">
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </Card>
    </div>
  );
}
