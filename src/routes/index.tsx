import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBR App — Organization & Member Registration" },
      { name: "description", content: "Register your organization, share a unique QR code, and let members join with approval." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">MBR App</h1>
          <p className="text-muted-foreground">సంస్థ లేదా సభ్యుడిగా register అవ్వండి</p>
        </header>

        <div className="space-y-4">
          <Link to="/org/register">
            <Card className="p-6 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3"><Building2 className="h-6 w-6 text-primary" /></div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">సంస్థ (Organization)</h2>
                  <p className="text-sm text-muted-foreground mt-1">కొత్త Org register చేసి QR code పొందండి</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/member/register">
            <Card className="p-6 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3"><Users className="h-6 w-6 text-primary" /></div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">సభ్యుడు (Member)</h2>
                  <p className="text-sm text-muted-foreground mt-1">Org QR code scan చేసి join అవ్వండి</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/auth"><Button variant="ghost">ఇప్పటికే account ఉందా? Login</Button></Link>
        </div>
      </div>
    </div>
  );
}
