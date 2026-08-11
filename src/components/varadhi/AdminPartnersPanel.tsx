import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListPartners,
  adminCreatePartner,
  adminSetPartnerActive,
  adminListPayoutRequests,
  adminUpdatePayoutStatus,
} from "@/lib/varadhi-partner.functions";
import { PARTNER_DEFAULT_PCT, PARTNER_LEVEL_LABEL, type PartnerLevel } from "@/lib/varadhi-partner";

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

export function AdminPartnersPanel() {
  const qc = useQueryClient();
  const listPartners = useServerFn(adminListPartners);
  const createPartner = useServerFn(adminCreatePartner);
  const setActive = useServerFn(adminSetPartnerActive);
  const listPayouts = useServerFn(adminListPayoutRequests);
  const updatePayout = useServerFn(adminUpdatePayoutStatus);

  const partnersQ = useQuery({ queryKey: ["varadhi-partners"], queryFn: () => listPartners() });
  const payoutsQ = useQuery({ queryKey: ["varadhi-payouts"], queryFn: () => listPayouts() });

  const [f, setF] = useState({
    email: "", full_name: "", phone: "", level: "mandal" as PartnerLevel,
    state: "Andhra Pradesh", district: "", mandal: "", commission_pct: "",
  });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    try {
      await createPartner({ data: {
        email: f.email, full_name: f.full_name, phone: f.phone, level: f.level,
        state: f.state, district: f.district, mandal: f.mandal,
        commission_pct: f.commission_pct ? Number(f.commission_pct) : PARTNER_DEFAULT_PCT[f.level],
      }});
      toast.success("పార్ట్‌నర్ జోడించబడ్డారు");
      setF({ ...f, email: "", full_name: "", phone: "", district: "", mandal: "", commission_pct: "" });
      qc.invalidateQueries({ queryKey: ["varadhi-partners"] });
    } catch (e: any) { toast.error(e.message ?? "విఫలమైంది"); }
    finally { setSaving(false); }
  };

  const mark = async (id: string, status: "approved" | "paid" | "rejected") => {
    try {
      await updatePayout({ data: { payout_id: id, status } });
      toast.success("అప్‌డేట్ అయింది");
      qc.invalidateQueries({ queryKey: ["varadhi-payouts"] });
      qc.invalidateQueries({ queryKey: ["varadhi-partners"] });
    } catch (e: any) { toast.error(e.message ?? "విఫలమైంది"); }
  };

  const partners = (partnersQ.data as any)?.partners ?? [];
  const payouts = (payoutsQ.data as any)?.payouts ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#1e3a8a]">కొత్త పార్ట్‌నర్ (ఇన్‌ఛార్జ్) జోడించండి</h2>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Email *" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input placeholder="పేరు" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <Input placeholder="ఫోన్" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={f.level}
            onChange={(e) => setF({ ...f, level: e.target.value as PartnerLevel })}
          >
            {(["mandal", "district", "state"] as PartnerLevel[]).map((l) => (
              <option key={l} value={l}>{PARTNER_LEVEL_LABEL[l].te} ({PARTNER_DEFAULT_PCT[l]}%)</option>
            ))}
          </select>
          <Input placeholder="రాష్ట్రం *" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          {f.level !== "state" && (
            <Input placeholder="జిల్లా *" value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} />
          )}
          {f.level === "mandal" && (
            <Input placeholder="మండలం *" value={f.mandal} onChange={(e) => setF({ ...f, mandal: e.target.value })} />
          )}
          <Input
            placeholder={`కమిషన్ % (డిఫాల్ట్ ${PARTNER_DEFAULT_PCT[f.level]})`}
            value={f.commission_pct}
            onChange={(e) => setF({ ...f, commission_pct: e.target.value })}
          />
        </div>
        <Button className="w-full" disabled={saving || !f.email} onClick={add}>
          {saving ? "సేవ్…" : "పార్ట్‌నర్ జోడించు"}
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#1e3a8a]">పార్ట్‌నర్లు ({partners.length})</h2>
        {partners.length === 0 && <p className="text-xs text-muted-foreground">ఇంకా పార్ట్‌నర్లు లేరు.</p>}
        {partners.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {p.full_name ?? "—"} <Badge variant="secondary">{p.level}</Badge>{" "}
                <span className="font-mono">{p.referral_code}</span>
              </p>
              <p className="text-muted-foreground">
                📍 {[p.mandal, p.district, p.state].filter(Boolean).join(", ")} · {p.commission_pct}% · ఆదాయం {money(p.earned)} (చెల్లించినది {money(p.paid)})
              </p>
            </div>
            <Button size="sm" variant={p.is_active ? "outline" : "default"}
              onClick={async () => {
                await setActive({ data: { partner_id: p.id, is_active: !p.is_active } });
                qc.invalidateQueries({ queryKey: ["varadhi-partners"] });
              }}>
              {p.is_active ? "ఆపు" : "యాక్టివ్"}
            </Button>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#1e3a8a]">పేఅవుట్ అభ్యర్థనలు</h2>
        {payouts.length === 0 && <p className="text-xs text-muted-foreground">అభ్యర్థనలు లేవు.</p>}
        <div className="overflow-x-auto">
          {payouts.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1">పార్ట్‌నర్</th><th>మొత్తం</th><th>తేదీ</th><th>స్థితి</th><th></th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">
                      {r.varadhi_partners?.full_name ?? "—"}
                      <div className="text-[10px] text-muted-foreground">
                        {r.varadhi_partners?.referral_code} · {[r.varadhi_partners?.mandal, r.varadhi_partners?.district].filter(Boolean).join(", ")}
                      </div>
                    </td>
                    <td className="font-semibold">{money(r.amount)}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => mark(r.id, "approved")}>ఆమోదం</Button>
                          <Button size="sm" variant="outline" onClick={() => mark(r.id, "rejected")}>తిరస్కరణ</Button>
                        </>
                      )}
                      {(r.status === "pending" || r.status === "approved") && (
                        <Button size="sm" onClick={() => mark(r.id, "paid")}>Paid</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
