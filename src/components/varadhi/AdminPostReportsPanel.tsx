import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { listPostModeration } from "@/lib/varadhi-moderation.functions";
import { PostModerationActions } from "./PostModerationActions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";

export function AdminPostReportsPanel() {
  const load = useServerFn(listPostModeration);
  const { lang } = useI18n();
  const t = (s: string) => sharedTranslation(lang, s) ?? s;
  const q = useQuery({ queryKey: ["post-moderation-list"], queryFn: () => load() });
  const [history, setHistory] = useState(false);
  return <section className="space-y-3">
    <div className="flex gap-2"><Button size="sm" variant={!history ? "default" : "outline"} onClick={() => setHistory(false)}>{t("పోస్ట్ రిపోర్టులు")}</Button><Button size="sm" variant={history ? "default" : "outline"} onClick={() => setHistory(true)}>{t("తొలగింపు చరిత్ర")}</Button></div>
    {q.isPending ? <p>{t("Loading")}</p> : q.error ? <p role="alert" className="text-destructive">{t("విఫలమైంది")}<Button variant="ghost" onClick={() => q.refetch()}>{t("మళ్ళీ ప్రయత్నించండి")}</Button></p> :
      history ? q.data?.removals.length ? q.data.removals.map(r => <article key={r.id} className="border-b border-border py-3 space-y-1"><h3 className="font-semibold break-words">{r.title}</h3><p className="text-sm whitespace-pre-wrap break-words">{t("కారణం")}: {r.reason}</p><p className="text-sm">{t("తొలగించిన అడ్మిన్")}: {r.actor_name}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></article>) : <p>{t("తొలగింపులు లేవు")}</p>
      : q.data?.reports.length ? q.data.reports.map(r => <article key={r.id} className="border-b border-border py-3 space-y-1">
        <h3 className="font-semibold break-words">{r.title}</h3><p className="text-sm whitespace-pre-wrap break-words">{t("కారణం")}: {r.reason}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {t(r.status === "pending" ? "పెండింగ్" : r.status === "removed" ? "పోస్ట్ తొలగించబడింది" : "రిపోర్ట్ మూసివేయబడింది")}</p>
        {r.review_reason && <p className="text-sm break-words">{r.review_reason} · {r.reviewer_name}</p>}
        {r.status === "pending" && <><Link className="text-sm underline" to={r.target_type === "listing" ? "/varadhi/item/$id" : "/varadhi/provider/$id"} params={{ id: r.target_id }}>{t("పోస్ట్ చూడండి")}</Link><PostModerationActions target={r} canReview /></>}
      </article>) : <p>{t("రిపోర్టులు లేవు")}</p>}
  </section>;
}