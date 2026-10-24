import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getPostModeration, reportVaradhiPost, reviewVaradhiPost } from "@/lib/varadhi-moderation.functions";
import type { PostTarget } from "@/lib/varadhi-moderation";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";

export function PostModerationActions({ target, onRemoved, canReview, unavailable = false }: { target: PostTarget; onRemoved?: () => void; canReview?: boolean; unavailable?: boolean }) {
  const statusFn = useServerFn(getPostModeration);
  const reportFn = useServerFn(reportVaradhiPost);
  const reviewFn = useServerFn(reviewVaradhiPost);
  const qc = useQueryClient();
  const { lang } = useI18n();
  const t = (s: string) => sharedTranslation(lang, s) ?? s;
  const status = useQuery({ queryKey: ["post-moderation", target.target_type, target.target_id], queryFn: () => statusFn({ data: target }), retry: false });
  const [action, setAction] = useState<"report" | "remove" | "dismiss" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = (a: typeof action) => { setReason(""); setError(""); setAction(a); };
  async function submit() {
    if (!action || !reason.trim()) return;
    setBusy(true); setError("");
    try {
      if (action === "report") await reportFn({ data: { ...target, reason } });
      else await reviewFn({ data: { ...target, reason, action } });
      toast.success(t(action === "report" ? "రిపోర్ట్ పంపబడింది" : action === "remove" ? "పోస్ట్ తొలగించబడింది" : "రిపోర్ట్ మూసివేయబడింది"));
      setAction(null);
      await qc.invalidateQueries({ queryKey: ["post-moderation"] });
      await qc.invalidateQueries({ queryKey: ["post-moderation-list"] });
      if (action === "remove") onRemoved?.();
    } catch (e) { setError(t(e instanceof Error ? e.message : "విఫలమైంది")); }
    finally { setBusy(false); }
  }
  if (status.data?.removed) return (
    <div className="my-3 border-l-2 border-destructive bg-muted p-3 text-sm space-y-1">
      <p className="font-semibold">{t("పోస్ట్ తొలగించబడింది")}</p>
      {status.data.removal && <><p>{t("కారణం")}: {status.data.removal.reason}</p><p>{t("తొలగించిన అడ్మిన్")}: {status.data.removal.actor_name}</p><p className="text-xs text-muted-foreground">{new Date(status.data.removal.created_at).toLocaleString()}</p></>}
    </div>
  );
  if (unavailable) return null;
  return <div className="mt-3 flex flex-wrap gap-2">
    <Button variant="outline" size="sm" disabled={status.data?.reported} onClick={() => open("report")}><Flag className="mr-1 h-4 w-4" />{t(status.data?.reported ? "రిపోర్ట్ పంపబడింది" : "పోస్ట్ రిపోర్ట్ చేయండి")}</Button>
    {status.data?.canRemove && <><Button variant="destructive" size="sm" onClick={() => open("remove")}><Trash2 className="mr-1 h-4 w-4" />{t("పోస్ట్ తొలగించండి")}</Button>{canReview && <Button variant="outline" size="sm" onClick={() => open("dismiss")}>{t("రిపోర్ట్ మూసివేయండి")}</Button>}</>}
    <Dialog open={action !== null} onOpenChange={v => { if (!busy && !v) setAction(null); }}>
      <DialogContent className="max-w-[calc(100%_-_2rem)] sm:max-w-lg">
        <DialogHeader><DialogTitle>{t(action === "report" ? "పోస్ట్ రిపోర్ట్ చేయండి" : action === "remove" ? "పోస్ట్ తొలగించండి" : "రిపోర్ట్ మూసివేయండి")}</DialogTitle><DialogDescription>{t("కారణం")}</DialogDescription></DialogHeader>
        <Textarea aria-label={t("కారణం")} placeholder={t("కారణం ఇవ్వండి")} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={4} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>{t("Cancel")}</Button><Button variant={action === "remove" ? "destructive" : "default"} disabled={busy || !reason.trim()} onClick={submit}>{t(busy ? "Loading" : action === "report" ? "రిపోర్ట్ పంపండి" : action === "remove" ? "పోస్ట్ తొలగించండి" : "రిపోర్ట్ మూసివేయండి")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}