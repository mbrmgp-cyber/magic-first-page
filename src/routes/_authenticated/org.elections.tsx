import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/org/elections")({
  head: () => ({ meta: [{ title: "Board Elections — MBR App" }] }),
  component: ElectionsPage,
});

function ElectionsPage() {
  return (
    <div className="min-h-screen bg-black p-4 md:p-6 text-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/org/dashboard">
          <Button variant="ghost" size="sm" className="text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back / వెనుకకు
          </Button>
        </Link>
        <Card className="p-6 bg-zinc-950 border-zinc-800 text-white shadow-[0_0_40px_rgba(255,140,40,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#ff8c28]/15 border border-[#ff8c28]/40">
              <Vote className="w-6 h-6 text-[#ff8c28]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Board Elections</h1>
              <p className="text-sm text-zinc-400">బోర్డు ఎన్నికలు</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            Schedule and manage your committee board elections here. This module is coming soon —
            nominations, voting and results will all be tracked in MBR.
          </p>
          <p className="mt-2 text-xs text-zinc-500 italic">
            కమిటీ బోర్డు ఎన్నికలను ఇక్కడ నిర్వహించవచ్చు. త్వరలో అందుబాటులో…
          </p>
        </Card>
      </div>
    </div>
  );
}
