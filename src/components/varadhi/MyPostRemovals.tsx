import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPostModeration } from "@/lib/varadhi-moderation.functions";
import { getMyVaradhiProfile } from "@/lib/varadhi.functions";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";

export function MyPostRemovals() {
  const load = useServerFn(listPostModeration);
  const { lang } = useI18n();
  const t = (s: string) => sharedTranslation(lang, s) ?? s;
  const q = useQuery({ queryKey: ["post-moderation-list"], queryFn: () => load() });
  if (!q.data?.removals.length) return null;
  return <section className="space-y-2 border-t border-border pt-3"><h2 className="font-semibold">{t("తొలగింపు చరిత్ర")}</h2>{q.data.removals.map(r => <article key={r.id} className="border-l-2 border-destructive pl-3 text-sm"><p className="font-semibold break-words">{r.title}</p><p className="whitespace-pre-wrap break-words">{t("కారణం")}: {r.reason}</p><p>{t("తొలగించిన అడ్మిన్")}: {r.actor_name}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></article>)}</section>;
}