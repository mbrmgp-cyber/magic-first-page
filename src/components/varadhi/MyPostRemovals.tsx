import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPostModeration } from "@/lib/varadhi-moderation.functions";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import { useState } from "react";
import { History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MyPostRemovals() {
  const load = useServerFn(listPostModeration);
  const { lang } = useI18n();
  const t = (s: string) => sharedTranslation(lang, s) ?? s;
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["post-moderation-list"], queryFn: () => load(), enabled: open });
  return <section className="space-y-3 border-t border-border pt-3" data-no-translate>
    <Button variant="outline" className="w-full justify-start whitespace-normal" aria-expanded={open} aria-controls="my-removal-history" onClick={() => setOpen(v => !v)}>
      <History className="h-4 w-4" />{t("తొలగింపు చరిత్ర")}<ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
    {open && <div id="my-removal-history" className="space-y-3">
      {q.isPending && <p className="text-sm text-muted-foreground">{t("Loading")}</p>}
      {q.isError && <p role="alert" className="text-sm text-destructive">{q.error.message}</p>}
      {q.data?.removals.length === 0 && <p className="text-sm text-muted-foreground">{t("No removal history")}</p>}
      {q.data?.removals.map(r => <article key={r.id} className="border-l-2 border-destructive pl-3 text-sm"><p className="font-semibold break-words">{r.title}</p><p className="whitespace-pre-wrap break-words">{t("కారణం")}: {r.reason}</p><p>{t("తొలగించిన అడ్మిన్")}: {r.actor_name}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></article>)}
    </div>}
  </section>;
}