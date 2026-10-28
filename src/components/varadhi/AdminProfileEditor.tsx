import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { adminEditVaradhiProfile } from "@/lib/varadhi.functions";
import { profileEditSchema } from "@/lib/varadhi-profile";
import { sharedTranslation } from "@/lib/language-support";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fields = [
  ["full_name", "పేరు"], ["phone", "ఫోన్ నెంబర్"], ["house_number", "ఇంటి నెంబర్"],
  ["address", "అడ్రస్"], ["city", "గ్రామం పేరు"], ["mandal", "మండలం"],
  ["district", "జిల్లా"], ["state", "రాష్ట్రం"], ["occupation", "వృత్తి"],
  ["business_name", "వ్యాపారం పేరు"], ["shop_name", "షాప్ పేరు"],
] as const;

export function AdminProfileEditor({ profile }: { profile: Record<string, any> }) {
  const { lang } = useI18n();
  const ui = (s: string) => sharedTranslation(lang, s) ?? s;
  const save = useServerFn(adminEditVaradhiProfile);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  async function submit() {
    setBusy(true);
    try {
      const changes = profileEditSchema.parse(values);
      await save({ data: { user_id: profile.user_id, changes } });
      await qc.invalidateQueries({ queryKey: ["varadhi-admin-list"] });
      await qc.invalidateQueries({ queryKey: ["varadhi-my-profile"] });
      toast.success(ui("Profile updated"));
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed"); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="outline" size="sm" onClick={() => {
      setValues(Object.fromEntries(fields.map(([key]) => [key, profile[key] ?? ""])));
      setOpen(true);
    }}><Pencil className="h-4 w-4" />{ui("Edit profile")}</Button>
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{ui("Edit profile")}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map(([key, label]) => <label key={key} className="space-y-1 text-sm">
              <span>{ui(label)}</span>
              <Input aria-label={ui(label)} data-notranslit value={values[key] ?? ""} required={key === "full_name" || key === "phone"} minLength={key === "phone" ? 10 : undefined} maxLength={key === "phone" ? 20 : key === "full_name" ? 150 : 1000} inputMode={key === "phone" ? "tel" : "text"} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
            </label>)}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>{ui("Cancel")}</Button>
            <Button type="submit" disabled={busy}><Save className="h-4 w-4" />{ui("Save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}