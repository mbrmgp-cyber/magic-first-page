import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalThemeApplier } from "@/components/GlobalThemeApplier";
import { SubscriptionGate } from "@/components/SubscriptionGate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <>
      <GlobalThemeApplier />
      <div className="mbr-themed-app min-h-screen bg-background text-foreground">
        <SubscriptionGate>
          <Outlet />
        </SubscriptionGate>
      </div>
    </>
  ),
});
