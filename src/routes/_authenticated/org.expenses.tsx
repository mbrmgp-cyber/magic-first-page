import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { recordExpense, listExpenses, listWalletAccounts, type ExpenseType, type WalletType } from "@/lib/cashflow.functions";
import { CURRENCIES, BASE_CURRENCY, type CurrencyCode, useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/expenses")({
  head: () => ({ meta: [{ title: "ఖర్చులు / Expenses" }] }),
  component: ExpensesPage,
});

const EXPENSE_TYPES: { v: ExpenseType; te: string; en: string }[] = [
  { v: "charity", te: "ఆర్థిక సహాయం / ధర్మం", en: "Financial Aid / Charity" },
  { v: "office", te: "ఆఫీసు ఖర్చులు", en: "Office Expenses" },
  { v: "meeting", te: "మీటింగ్ ఖర్చులు", en: "Meeting Expenses" },
  { v: "misc", te: "ఇతరములు", en: "Miscellaneous" },
];

const WALLETS: { v: WalletType; te: string; en: string }[] = [
  { v: "bank", te: "బ్యాంక్ ఖాతా", en: "Bank Account" },
  { v: "accountant", te: "అకౌంటెంట్", en: "Cashier" },
  { v: "president", te: "అధ్యక్షుడు", en: "President" },
];

function ExpensesPage() {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const lt = (en: string, te: string) => lang === "te" ? te : en;
  const qc = useQueryClient();
  const save = useServerFn(recordExpense);
  const listFn = useServerFn(listExpenses);
  const listQ = useQuery({ queryKey: ["org-expenses"], queryFn: () => listFn() });
  const walletsFn = useServerFn(listWalletAccounts);
  const walletsQ = useQuery({ queryKey: ["wallet-accounts"], queryFn: () => walletsFn() });

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [walletAccountId, setWalletAccountId] = useState<string>("");
  const [expType, setExpType] = useState<ExpenseType>("charity");
  const [wallet, setWallet] = useState<WalletType>("bank");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    const rate = Number(exchangeRate);
    if (!recipient.trim()) { toast.error(lt("Recipient required", "గ్రహీత పేరు అవసరం")); return; }
    if (!(a > 0)) { toast.error(lt("Valid amount required", "సరైన మొత్తం అవసరం")); return; }
    if (txCurrency !== BASE_CURRENCY && !(rate > 0)) { toast.error(lt("Exchange rate required for foreign currency", "విదేశీ కరెన్సీకి మార్పిడి రేటు అవసరం")); return; }
    setBusy(true);
    try {
      await save({ data: {
        entry_date: date, recipient_name: recipient, amount: a,
        expense_type: expType, wallet,
        wallet_account_id: walletAccountId || undefined,
        currency: txCurrency,
        exchange_rate: txCurrency === BASE_CURRENCY ? 1 : rate,
        remarks: remarks || undefined,
      }});
      const baseAmt = a * (txCurrency === BASE_CURRENCY ? 1 : rate);
      toast.success(lt(`${sym}${baseAmt.toLocaleString("en-IN")} expense recorded`, `${sym}${baseAmt.toLocaleString("en-IN")} ఖర్చు నమోదు అయింది`));
      setRecipient(""); setAmount(""); setRemarks("");
      setTxCurrency(BASE_CURRENCY); setExchangeRate("1"); setWalletAccountId("");
      qc.invalidateQueries({ queryKey: ["org-expenses"] });
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
            <h1 className="text-lg font-bold text-white">{lt("Record Expenses & Aid", "ఖర్చులు మరియు ఆర్థిక సహాయం నమోదు")}</h1>
            <p className="text-xs text-white/70">{lt("Record payments", "చెల్లింపులు నమోదు చేయండి")}</p>
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
              <Label className="text-white">{lt("Recipient Name", "గ్రహీత పేరు")}</Label>
              <Input required value={recipient} onChange={(e) => setRecipient(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">{lt("Expense Type", "ఖర్చు రకం")}</Label>
              <Select value={expType} onValueChange={(v) => setExpType(v as ExpenseType)}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{lt(t.en, t.te)}</SelectItem>)}
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
              <Label className="text-white">{lt("Account (paid from)", "ఖాతా (చెల్లించబడేది)")}</Label>
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
              <Label className="text-white">{lt("Reason / Notes", "కారణం / గమనికలు")}</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}
                className="w-full bg-red-600 hover:bg-red-700 text-white">
                <TrendingDown className="h-4 w-4 mr-2" />
                {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save Expense", "ఖర్చును సేవ్ చేయండి")}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="bg-zinc-950 border-white/10 p-4">
          <h2 className="text-sm font-semibold mb-3 text-white">{lt("Recent Expenses", "ఇటీవలి ఖర్చులు")}</h2>
          {rows.length === 0 ? (
            <p className="text-xs text-white/60">{lt("No entries yet.", "నమోదులు లేవు.")}</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-zinc-900 border border-white/5 rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-white">{r.recipient_name} • <span className="text-red-400">{sym}{Number(r.amount).toLocaleString("en-IN")}</span></p>
                    <p className="text-[11px] text-white/60">{r.entry_date} • {(() => { const t = EXPENSE_TYPES.find(x => x.v === r.expense_type); return t ? lt(t.en, t.te) : r.expense_type; })()} • {(() => { const w = WALLETS.find(x => x.v === r.wallet); return w ? lt(w.en, w.te) : r.wallet; })()}</p>
                    {r.remarks && <p className="text-[11px] text-white/50 mt-0.5">{r.remarks}</p>}
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
