import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalThemeApplier } from "@/components/GlobalThemeApplier";
import { DynamicAppManifest } from "@/components/DynamicAppManifest";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { RbacProvider } from "@/lib/rbac";
import { GlobalAdBar } from "@/components/GlobalAdBar";

import { ModuleRouteGuard } from "@/components/ModuleRouteGuard";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <RbacProvider>
      <GlobalThemeApplier />
      <DynamicAppManifest />
      
      <div className="mbr-themed-app min-h-screen bg-background text-foreground pb-[90px]">
        <SubscriptionGate>
          <ModuleRouteGuard>
            <Outlet />
          </ModuleRouteGuard>
        </SubscriptionGate>
      </div>
      <GlobalAdBar />
    </RbacProvider>
  ),
});

