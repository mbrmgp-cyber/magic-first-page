import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function SectionShell({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/org/dashboard" className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <Card className="mbr-theme-big-box p-5 backdrop-blur-xl shadow-xl">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
        </Card>
        {children ?? (
          <Card className="mbr-theme-mini-box p-6 backdrop-blur text-center text-muted-foreground">
            <p>ఈ సెక్షన్ త్వరలో అందుబాటులోకి వస్తుంది.</p>
            <p className="text-xs mt-2">(Coming soon)</p>
          </Card>
        )}
      </div>
    </div>
  );
}
