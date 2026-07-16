import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";
import { getOrgBankDetails, updateOrgBankDetails } from "@/lib/org.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/org/bank-details")({
  head: () => ({ meta: [{ title: "Society Bank Details / సొసైటీ బ్యాంక్ వివరాలు" }] }),
  component: () => <RoleGate need="accounts"><BankDetailsPage /></RoleGate>,
});

function BankDetailsPage() {
  const { lang } = useI18n();
  const lt = (en: string, te: string) => (lang === "te" ? te : en);
  const qc = useQueryClient();
  const fetchFn = useServerFn(getOrgBankDetails);
  const saveFn = useServerFn(updateOrgBankDetails);
  const q = useQuery({ queryKey: ["org-bank-details"], queryFn: () => fetchFn() });

  const [form, setForm] = useState({
    bank_account_holder: "",
    bank_name: "",
    bank_branch: "",
    bank_account_number: "",
    bank_ifsc: "",
  });

  useEffect(() => {
    const o: any = q.data?.org;
    if (o) {
      setForm({
        bank_account_holder: o.bank_account_holder ?? "",
        bank_name: o.bank_name ?? "",
        bank_branch: o.bank_branch ?? "",
        bank_account_number: o.bank_account_number ?? "",
        bank_ifsc: o.bank_ifsc ?? "",
      });
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success(lt("Bank details saved", "బ్యాంక్ వివరాలు సేవ్ చేయబడ్డాయి"));
      qc.invalidateQueries({ queryKey: ["org-bank-details"] });
      qc.invalidateQueries({ queryKey: ["my-membership"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-xl mx-auto p-4 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/org/accounts-hub" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{lt("Society Bank Details", "సొసైటీ బ్యాంక్ వివరాలు")}</h1>
            <p className="text-xs text-white/60">{lt("Shown to members for payments", "సభ్యులకు పేమెంట్‌ల కోసం చూపబడతాయి")}</p>
          </div>
        </header>

        <Card className="p-5 bg-zinc-950 border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-semibold">{lt("Bank Account Info", "బ్యాంక్ ఖాతా సమాచారం")}</span>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{lt("Account Holder Name", "ఖాతాదారుని పేరు")}</Label>
            <Input
              value={form.bank_account_holder}
              onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
              placeholder={lt("e.g. Chitvel Helpline Society", "ఉదా. చిత్వేల్ హెల్ప్‌లైన్ సొసైటీ")}
              className="bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{lt("Bank Name", "బ్యాంక్ పేరు")}</Label>
            <Input
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              placeholder={lt("e.g. State Bank of India", "ఉదా. స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా")}
              className="bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{lt("Branch", "బ్రాంచ్")}</Label>
            <Input
              value={form.bank_branch}
              onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
              placeholder={lt("e.g. Chitvel Main Branch", "ఉదా. చిత్వేల్ మెయిన్ బ్రాంచ్")}
              className="bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{lt("Account Number", "ఖాతా నంబర్")}</Label>
            <Input
              value={form.bank_account_number}
              onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
              inputMode="numeric"
              className="bg-black/40 border-white/10 text-white font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{lt("IFSC Code", "IFSC కోడ్")}</Label>
            <Input
              value={form.bank_ifsc}
              onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
              placeholder="SBIN0001234"
              className="bg-black/40 border-white/10 text-white font-mono uppercase"
            />
          </div>

          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {save.isPending ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save Details", "వివరాలు సేవ్ చేయండి")}
          </Button>
        </Card>

        <p className="text-center text-[11px] text-white/40">
          {lt(
            "These details appear on the member dashboard under 'Pay to Society'.",
            "ఈ వివరాలు సభ్యుడి డాష్‌బోర్డులో 'సొసైటీకి పేమెంట్' టైల్‌లో కనిపిస్తాయి."
          )}
        </p>
      </div>
    </div>
  );
}
