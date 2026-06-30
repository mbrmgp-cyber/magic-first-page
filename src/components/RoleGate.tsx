import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSimRole, canAccess, ROLE_LABELS, type AccessKey } from "@/lib/rbac";

export function RoleGate({ need, children }: { need: AccessKey; children: React.ReactNode }) {
  const { role } = useSimRole();
  if (canAccess(role, need)) return <>{children}</>;
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <Card className="max-w-md w-full p-6 text-center space-y-3 bg-zinc-950 border-zinc-800 text-white">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-bold">Access Restricted · ప్రవేశం లేదు</h2>
        <p className="text-sm text-zinc-400">
          ఈ సెక్షన్ <span className="font-semibold text-white">{ROLE_LABELS[role].te}</span> పాత్రకు అందుబాటులో లేదు.
        </p>
        <p className="text-xs text-zinc-500">
          This area is not available for the <span className="font-semibold text-zinc-300">{ROLE_LABELS[role].en}</span> role. Switch role from the badge at the bottom-right to test other layouts.
        </p>
        <Link to="/org/dashboard">
          <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">Back to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
