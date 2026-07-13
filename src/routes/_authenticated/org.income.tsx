import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ReceiptText, Download, Send, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { recordIncome, listIncome, listWalletAccounts, type IncomeType, type WalletType } from "@/lib/cashflow.functions";
import { getMyOrg } from "@/lib/org.functions";
import { CURRENCIES, BASE_CURRENCY, type CurrencyCode, useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/income")({
  head: () => ({ meta: [{ title: "ఆదాయం / Income Receipts" }] }),
  component: IncomePage,
});

const INCOME_TYPES: { v: IncomeType; te: string; en: string }[] = [
  { v: "registration_fee", te: "నమోదు రుసుము", en: "Registration Fee" },
  { v: "donation", te: "విరాళం", en: "Donation" },
  { v: "other", te: "ఇతరం", en: "Other" },
];

const WALLETS: { v: WalletType; te: string; en: string }[] = [
  { v: "bank", te: "బ్యాంక్ ఖాతా", en: "Bank Account" },
  { v: "accountant", te: "అకౌంటెంట్", en: "Cashier" },
  { v: "president", te: "అధ్యక్షుడు", en: "President" },
];

function IncomePage() {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const lt = (en: string, te: string) => lang === "te" ? te : en;
  const qc = useQueryClient();
  const save = useServerFn(recordIncome);
  const listFn = useServerFn(listIncome);
  const orgFn = useServerFn(getMyOrg);

  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => orgFn() });
  const listQ = useQuery({ queryKey: ["org-income"], queryFn: () => listFn() });
  const walletsFn = useServerFn(listWalletAccounts);
  const walletsQ = useQuery({ queryKey: ["wallet-accounts"], queryFn: () => walletsFn() });

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payer, setPayer] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [walletAccountId, setWalletAccountId] = useState<string>("");
  const [incType, setIncType] = useState<IncomeType>("donation");
  const [wallet, setWallet] = useState<WalletType>("bank");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);


  function generateReceiptHTML(entry: any) {
    const org = orgQ.data?.org;
    const typeLabel = INCOME_TYPES.find((t) => t.v === entry.income_type)?.en ?? entry.income_type;
    const w = WALLETS.find((x) => x.v === entry.wallet);
    const walletLabel = w ? lt(w.en, w.te) : entry.wallet;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${entry.receipt_no}</title>
<style>
  body{font-family:'Helvetica',Arial,sans-serif;margin:0;padding:24px;color:#111}
  .wrap{max-width:680px;margin:auto;border:2px solid #ff8c28;border-radius:14px;overflow:hidden}
  .hdr{display:flex;align-items:center;gap:14px;padding:18px 22px;background:linear-gradient(90deg,#ff8c28,#ffb072);color:#fff}
  .hdr img{width:56px;height:56px;border-radius:50%;background:#fff;padding:4px;object-fit:contain}
  .hdr h1{margin:0;font-size:20px}
  .hdr p{margin:2px 0 0;font-size:12px;opacity:.9}
  .title{text-align:center;background:#fff7ee;padding:10px;font-weight:bold;letter-spacing:2px;color:#b85a00}
  .meta{display:flex;justify-content:space-between;padding:14px 22px;font-size:13px;border-bottom:1px dashed #ddd}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:10px 22px;border-bottom:1px solid #eee}
  td.k{color:#666;width:38%}
  .amt{font-size:22px;color:#0a8a3b;font-weight:bold;text-align:right;padding:14px 22px;background:#f0fdf4}
  .ftr{display:flex;justify-content:space-between;align-items:flex-end;padding:24px 22px 18px;font-size:12px;color:#555}
  .sig{text-align:center;border-top:1px solid #999;padding-top:4px;width:160px}
  @media print{ body{padding:0} .noprint{display:none} }
</style></head><body>
  <div class="wrap">
    <div class="hdr">
      ${org?.logo_url ? `<img src="${org.logo_url}" alt="logo"/>` : ""}
      <div>
        <h1>${org?.name ?? "Society"}</h1>
        <p>${org?.slogan ?? ""} ${org?.gov_reg_number ? "• Reg: " + org.gov_reg_number : ""}</p>
      </div>
    </div>
    <div class="title">OFFICIAL RECEIPT / అధికారిక రసీదు</div>
    <div class="meta">
      <span>Receipt No: <b>${entry.receipt_no}</b></span>
      <span>Date: <b>${entry.entry_date}</b></span>
    </div>
    <table>
      <tr><td class="k">Received From / నుండి అందినది</td><td><b>${entry.payer_name}</b></td></tr>
      ${entry.payer_phone ? `<tr><td class="k">Phone</td><td>${entry.payer_phone}</td></tr>` : ""}
      <tr><td class="k">Income Type</td><td>${typeLabel}</td></tr>
      <tr><td class="k">Wallet</td><td>${walletLabel}</td></tr>
      ${entry.remarks ? `<tr><td class="k">Remarks</td><td>${entry.remarks}</td></tr>` : ""}
    </table>
    <div class="amt">${sym} ${Number(entry.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
    <div class="ftr">
      <div>Thank you for your contribution.<br/>Generated: ${new Date().toLocaleString()}</div>
      <div class="sig">Authorised Signatory<br/>${org?.president_name ?? "President"}</div>
    </div>
  </div>
  <div class="noprint" style="text-align:center;margin-top:14px">
    <button onclick="window.print()" style="background:#ff8c28;color:#fff;padding:10px 22px;border:0;border-radius:8px;font-weight:bold;cursor:pointer">Print / Save PDF</button>
  </div>
</body></html>`;
  }

  function openReceipt(entry: any) {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) { toast.error(lt("Popup blocked", "పాప్‌అప్ బ్లాక్ అయింది")); return; }
    w.document.write(generateReceiptHTML(entry));
    w.document.close();
  }

  function shareWhatsApp(entry: any) {
    const org = orgQ.data?.org?.name ?? "Society";
    const msg = `*${org} — Official Receipt*\n` +
      `No: ${entry.receipt_no}\nDate: ${entry.entry_date}\n` +
      `From: ${entry.payer_name}\nAmount: ${sym}${Number(entry.amount).toLocaleString("en-IN")}\n` +
      `Type: ${INCOME_TYPES.find((t) => t.v === entry.income_type)?.en}\n\nThank you for your contribution.`;
    const phoneClean = (entry.payer_phone || "").replace(/\D/g, "");
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function emailReceipt(entry: any) {
    const org = orgQ.data?.org?.name ?? "Society";
    const subject = `${org} — Receipt ${entry.receipt_no}`;
    const body = `Dear ${entry.payer_name},%0D%0A%0D%0AThank you for your contribution of ${sym}${entry.amount}.%0D%0AReceipt No: ${entry.receipt_no}%0D%0ADate: ${entry.entry_date}%0D%0A%0D%0APlease find your official receipt attached (printed from the receipt window).%0D%0A%0D%0ARegards,%0D%0A${org}`;
    const to = entry.payer_email ? encodeURIComponent(entry.payer_email) : "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    const rate = Number(exchangeRate);
    if (!payer.trim()) { toast.error(lt("Payer name required", "చెల్లించినవారి పేరు అవసరం")); return; }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { toast.error(lt("Valid email address required", "సరైన ఈమెయిల్ చిరునామా అవసరం")); return; }
    if (!(a > 0)) { toast.error(lt("Valid amount required", "సరైన మొత్తం అవసరం")); return; }
    if (txCurrency !== BASE_CURRENCY && !(rate > 0)) { toast.error(lt("Exchange rate required for foreign currency", "విదేశీ కరెన్సీకి మార్పిడి రేటు అవసరం")); return; }
    setBusy(true);
    try {
      const res = await save({ data: {
        entry_date: date, payer_name: payer, payer_phone: phone || undefined,
        payer_email: email,
        amount: a, income_type: incType, wallet,
        wallet_account_id: walletAccountId || undefined,
        currency: txCurrency,
        exchange_rate: txCurrency === BASE_CURRENCY ? 1 : rate,
        remarks: remarks || undefined,
      }});
      toast.success(lt(`Receipt ${res.entry.receipt_no} saved — opening email…`, `రసీదు ${res.entry.receipt_no} సేవ్ అయింది — ఈమెయిల్ తెరుస్తోంది…`));
      openReceipt(res.entry);
      setTimeout(() => emailReceipt(res.entry), 400);
      setPayer(""); setPhone(""); setEmail(""); setAmount(""); setRemarks("");
      setTxCurrency(BASE_CURRENCY); setExchangeRate("1"); setWalletAccountId("");
      qc.invalidateQueries({ queryKey: ["org-income"] });
      qc.invalidateQueries({ queryKey: ["cashflow"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally { setBusy(false); }
  }


  const rows = (listQ.data?.rows ?? []) as any[];

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/org/accounts-hub" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">{lt("Record Income & Donations", "ఆదాయం మరియు విరాళాల నమోదు")}</h1>
            <p className="text-xs text-white/70">{lt("Issue receipts", "రసీదులు జారీ చేయండి")}</p>
          </div>
        </header>

        <Card className="bg-zinc-950 border-white/10 p-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white">{lt("Date", "తేదీ")}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">{lt("Amount", "మొత్తం")} ({CURRENCIES.find(c => c.code === txCurrency)?.symbol})</Label>
              <Input type="number" min="1" step="0.01" required value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white">{lt("Payer Name", "చెల్లించినవారి పేరు")}</Label>
              <Input required value={payer} onChange={(e) => setPayer(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">{lt("Phone Number", "ఫోన్ నంబర్")}</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…" className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white">{lt("Email Address", "ఇమెయిల్ చిరునామా")} <span className="text-[10px] text-white/60">{lt("(receipt will be sent)", "(రసీదు పంపబడుతుంది)")}</span></Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" className="bg-zinc-900 border-white/10 text-white" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white">{lt("Income Type", "ఆదాయ రకం")}</Label>
              <Select value={incType} onValueChange={(v) => setIncType(v as IncomeType)}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{lt(t.en, t.te)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">{lt("Currency", "కరెన్సీ")}</Label>
              <Select value={txCurrency} onValueChange={(v) => { setTxCurrency(v as CurrencyCode); if (v === BASE_CURRENCY) setExchangeRate("1"); }}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {txCurrency !== BASE_CURRENCY && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-white">{lt("Exchange rate", "మార్పిడి రేటు")} (1 {txCurrency} = ? INR)</Label>
                <Input type="number" min="0" step="0.0001" required value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-white" />
                {Number(amount) > 0 && Number(exchangeRate) > 0 && (
                  <p className="text-[11px] text-amber-400">
                    ≈ {sym} {(Number(amount) * Number(exchangeRate)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white">{lt("Account (credited to)", "ఖాతా (జమ చేయబడేది)")}</Label>
              <Select value={walletAccountId || "__legacy__"} onValueChange={(v) => setWalletAccountId(v === "__legacy__" ? "" : v)}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__legacy__">{lt("— General Account —", "— సాధారణ ఖాతా —")}</SelectItem>
                  {(walletsQ.data?.rows ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={wallet} onValueChange={(v) => setWallet(v as WalletType)}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WALLETS.map((w) => <SelectItem key={w.v} value={w.v}>{lt(w.en, w.te)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white">{lt("Notes", "గమనికలు")}</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}
                className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
                <ReceiptText className="h-4 w-4 mr-2" />
                {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save Receipt", "రసీదును సేవ్ చేయండి")}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="bg-zinc-950 border-white/10 p-4">
          <h2 className="text-sm font-semibold mb-3 text-white">{lt("Recent Receipts", "ఇటీవలి రసీదులు")}</h2>
          {rows.length === 0 ? (
            <p className="text-xs text-white/60">{lt("No entries yet.", "నమోదులు లేవు.")}</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-zinc-900 border border-white/5 rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-white">{r.payer_name} • <span className="text-[#ff8c28]">{sym}{Number(r.amount).toLocaleString("en-IN")}</span></p>
                    <p className="text-[11px] text-white/60">{r.receipt_no} • {r.entry_date} • {(() => { const t = INCOME_TYPES.find(x => x.v === r.income_type); return t ? lt(t.en, t.te) : r.income_type; })()}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openReceipt(r)} title="Print / PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => shareWhatsApp(r)} title="WhatsApp">
                      <Send className="h-4 w-4 text-green-400" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => emailReceipt(r)} title="Email">
                      <Mail className="h-4 w-4 text-blue-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
