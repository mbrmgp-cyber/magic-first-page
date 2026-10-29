import { createFileRoute, ClientOnly, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getOrganizationShareBranding, resolveOrganizationShareAccess } from "@/lib/organization-share.functions";
import { MBR_SHARE_ORIGIN, organizationShareUrl, shareDestination, SHARE_DESTINATIONS } from "@/lib/organization-share";
import { MemberRegister } from "@/routes/member.register";
import { supabase } from "@/integrations/supabase/client";
import { setActiveOrgId } from "@/lib/active-org";
import { useI18n, localizeText } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/society/$code")({
  validateSearch: (search: Record<string, unknown>) => ({ destination: shareDestination(search.destination) }),
  loaderDeps: ({ search }) => ({ destination: search.destination }),
  loader: async ({ params, deps }) => ({ org: await getOrganizationShareBranding({ data: { code: params.code } }), destination: deps.destination }),
  head: ({ loaderData }) => {
    const org = loaderData?.org;
    const title = org ? `${org.name.trim()} — MBR APP` : "Society unavailable — MBR APP";
    const description = org ? `${org.name.trim()} — సభ్యుల నమోదు / New member registration.` : "This society link is unavailable.";
    const url = org ? organizationShareUrl(org.org_code, loaderData?.destination) : undefined;
    const image = org?.has_logo ? `${MBR_SHARE_ORIGIN}/society/${encodeURIComponent(org.org_code)}/logo` : undefined;
    return {
      meta: [
        { title }, { name: "description", content: description }, { property: "og:title", content: title },
        { property: "og:description", content: description }, { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(url ? [{ property: "og:url", content: url }] : [{ name: "robots", content: "noindex" }]),
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }, { property: "og:image:alt", content: org?.name ?? "Society logo" }] : []),
      ],
      links: url ? [{ rel: "canonical", href: url }] : [],
    };
  },
  component: SocietySharePage,
});

function SocietySharePage() {
  const { org, destination } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resolveAccess = useServerFn(resolveOrganizationShareAccess);
  const [state, setState] = useState<"checking" | "register" | "error">("checking");
  const [attempt, setAttempt] = useState(0);
  const { lang } = useI18n();
  useEffect(() => {
    let cancelled = false;
    setState("checking");
    async function open() {
      if (!org) return;
      if (destination === "register") { setState("register"); return; }
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) { if (!cancelled) setState("register"); return; }
      const access = await resolveAccess({ data: { orgId: org.id, destination } });
      if (cancelled) return;
      if (!access.allowed) { setState("register"); return; }
      setActiveOrgId(org.id);
      queryClient.clear();
      await navigate({ to: SHARE_DESTINATIONS[destination].path, replace: true });
    }
    void open().catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [org, destination, attempt, navigate, queryClient, resolveAccess]);
  if (!org) return <main className="p-6 text-center text-foreground">{localizeText({ en: "Society unavailable", te: "సంస్థ అందుబాటులో లేదు" }, lang)}</main>;
  return <main>
    <header className="flex items-center justify-center gap-3 border-b border-border bg-background p-4 text-foreground">
      {org.has_logo && <img src={`/society/${encodeURIComponent(org.org_code)}/logo`} alt={`${org.name} logo`} className="h-20 w-20 object-contain" />}
      <h1 className="max-w-lg break-words text-xl font-semibold">{org.name}</h1>
    </header>
    {state === "register" ? <ClientOnly><MemberRegister key={org.id} initialCode={org.org_code} /></ClientOnly>
      : state === "error" ? <div className="p-6 text-center"><p className="mb-3 text-foreground">{localizeText({ en: "Could not check access. Please try again.", te: "అనుమతి తనిఖీ కాలేదు. మళ్లీ ప్రయత్నించండి." }, lang)}</p><Button onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" />{localizeText({ en: "Retry", te: "మళ్లీ ప్రయత్నించండి" }, lang)}</Button></div>
        : <p role="status" className="p-6 text-center text-muted-foreground">{localizeText({ en: "Opening…", te: "తెరుస్తోంది…" }, lang)}</p>}
  </main>;
}