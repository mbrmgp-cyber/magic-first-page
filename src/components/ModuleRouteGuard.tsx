import { useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyModules, ADMIN_MODULES } from "@/lib/admin-permissions.functions";

// Map each guarded route prefix to its module key.
const ROUTE_MODULE: { prefix: string; key: string }[] = ADMIN_MODULES.map(
  (m) => ({ prefix: m.route, key: m.key }),
);

function moduleKeyFor(pathname: string): string | null {
  // longest prefix match to avoid /org/accounts matching /org/accounts-hub oddly
  const hit = [...ROUTE_MODULE]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit?.key ?? null;
}

export function ModuleRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fetchMods = useServerFn(getMyModules);

  const modKey = moduleKeyFor(location.pathname);

  const isAdminAccess = location.pathname.startsWith("/org/admin-access");
  const needsCheck = !!modKey || isAdminAccess;

  const q = useQuery({
    queryKey: ["my-admin-modules"],
    queryFn: () => fetchMods(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: needsCheck,
  });

  const allowed =
    !needsCheck ||
    q.isLoading ||
    q.isFetching ||
    !q.data ||
    (isAdminAccess
      ? q.data.isSuperAdmin
      : q.data.isSuperAdmin || (q.data.modules as string[]).includes(modKey!));


  useEffect(() => {
    // no auto-redirect; show the block screen so the user sees why
  }, [allowed]);

  if (allowed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <Card className="max-w-md w-full p-6 text-center space-y-3 bg-zinc-950 border-zinc-800 text-white">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-bold">Access Restricted · ప్రవేశం లేదు</h2>
        <p className="text-sm text-zinc-400">
          మీకు ఈ సెక్షన్‌కి Super Admin అనుమతి ఇవ్వలేదు.
        </p>
        <p className="text-xs text-zinc-500">
          You don't have permission to view this page. Ask the Super Admin to
          enable this module for your role in "Admin Role &amp; Access".
        </p>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={() => navigate({ to: "/org/dashboard", replace: true })}
        >
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
}
