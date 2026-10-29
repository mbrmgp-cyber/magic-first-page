import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyOrg } from "@/lib/org.functions";
import { destinationForPath, organizationShareUrl } from "@/lib/organization-share";
import { useI18n, localizeText } from "@/lib/i18n";
import { toast } from "sonner";

export function OrganizationShareBar() {
  const { pathname } = useLocation();
  const fetchOrg = useServerFn(getMyOrg);
  const { lang } = useI18n();
  const { data } = useQuery({ queryKey: ["share-organization", pathname], queryFn: () => fetchOrg(), enabled: pathname.startsWith("/org/"), retry: false });
  const org = data?.org;
  if (!pathname.startsWith("/org/") || !org?.org_code || org.approval_status !== "approved") return null;
  async function share() {
    if (!org?.org_code) return;
    const url = organizationShareUrl(org.org_code, destinationForPath(pathname));
    try {
      if (navigator.share) await navigator.share({ title: org.name, url });
      else { await navigator.clipboard.writeText(url); toast.success(localizeText({ en: "Link copied", te: "లింక్ కాపీ అయింది" }, lang)); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(localizeText({ en: "Could not share link", te: "లింక్ షేర్ కాలేదు" }, lang));
    }
  }
  return <div className="border-b border-border bg-background px-3 py-2"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
    <span className="truncate text-sm font-medium text-foreground">{org.name}</span>
    <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4" />{localizeText({ en: "Share", te: "షేర్" }, lang)}</Button>
  </div></div>;
}