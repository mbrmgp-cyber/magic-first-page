import { useI18n } from "@/lib/i18n";
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
  const { lang } = useI18n();
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
    (q.isFetchedAfterMount && !!q.data &&
    (isAdminAccess
      ? q.data.isSuperAdmin
      : q.data.isSuperAdmin || (q.data.modules as string[]).includes(modKey!)));
  const checking = needsCheck && !q.isFetchedAfterMount && !q.isError;


  useEffect(() => {
    // no auto-redirect; show the block screen so the user sees why
  }, [allowed]);

  if (allowed) return <>{children}</>;
  const L = (te: string, en: string, hi: string) => (lang === "te" ? te : lang === "hi" ? hi : en);
  if (checking) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <Card className="max-w-md w-full p-6 text-center space-y-3 bg-zinc-950 border-zinc-800 text-white">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-bold">{L("ప్రవేశం లేదు", "Access Restricted", "प्रवेश प्रतिबंधित")}</h2>
        <p className="text-sm text-zinc-400">
          {L("ఈ పేజీ చూసే అనుమతి మీకు లేదు. \"నిర్వాహక పాత్ర & అనుమతులు\"లో మీ పాత్రకు ఈ విభాగాన్ని ప్రారంభించమని సూపర్ నిర్వాహకుడిని అడగండి.",
            "You don't have permission to view this page. Ask the Super Admin to enable this module for your role in \"Admin Role & Access\".",
            "आपको यह पृष्ठ देखने की अनुमति नहीं है। \"व्यवस्थापक भूमिका और पहुँच\" में अपनी भूमिका के लिए यह मॉड्यूल चालू करने हेतु सुपर व्यवस्थापक से कहें।")}
        </p>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={() => navigate({ to: "/org/dashboard", replace: true })}
        >
          {L("డాష్‌బోర్డ్‌కు తిరిగి", "Back to Dashboard", "डैशबोर्ड पर वापस")}
        </Button>
      </Card>
    </div>
  );
}
