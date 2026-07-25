import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, CalendarClock, CheckCircle2, XCircle, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listOrgReceipts, getMySubscriptionStatus } from "@/lib/org.functions";
import { printReceipt } from "@/lib/subscription-receipt";

export const Route = createFileRoute("/_authenticated/org/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription & Receipts — MBR App" },
      { name: "description", content: "View subscription status and download payment receipts." },
    ],
  }),
  component: SubscriptionPage,
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(iso);
  }
}
function fmtAmount(a: number | string, ccy: string) {
  const n = typeof a === "number" ? a : Number(a || 0);
  const symbol = ccy === "INR" ? "Rs." : (ccy || "").toUpperCase();
  return `${symbol} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SubscriptionPage() {
  const fetchReceipts = useServerFn(listOrgReceipts);
  const fetchStatus = useServerFn(getMySubscriptionStatus);
  const rq = useQuery({ queryKey: ["my-receipts"], queryFn: () => fetchReceipts() });
  const sq = useQuery({ queryKey: ["my-subscription-status"], queryFn: () => fetchStatus() });

  const org = rq.data?.org ?? null;
  const receipts = rq.data?.receipts ?? [];
  const status = sq.data;
  const expDate = status?.expires_at ? new Date(status.expires_at as string) : null;
  const expired = !!expDate && expDate.getTime() < Date.now();

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-12" translate="no">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/org/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border bg-zinc-950 border-zinc-800">
            <Receipt className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold">Subscription & Receipts</span>
          </div>
        </div>

        <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Subscription Status</p>
              <p className="text-lg font-bold">{org?.name ?? "—"}</p>
              <p className="text-xs text-zinc-400 font-mono">{org?.org_code ?? ""}</p>
            </div>
            <Badge className={expired ? "bg-red-600 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-600"}>
              {expired ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              {expired ? "EXPIRED" : "ACTIVE"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm border-t border-dashed border-zinc-800 pt-3">
            <CalendarClock className="h-4 w-4 text-amber-400" />
            <span className="text-zinc-400">Valid until:</span>
            <span className={`font-semibold ${expired ? "text-red-400" : "text-white"}`}>
              {expDate ? fmtDate(expDate.toISOString()) : "—"}
            </span>
          </div>
          {expired && (
            <p className="text-xs text-red-300">
              Please contact MBR Super Admin at <a className="underline" href="mailto:mbrplatform@gmail.com">mbrplatform@gmail.com</a> to renew.
            </p>
          )}
        </Card>

        <Card className="p-4 bg-zinc-950 border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-amber-400" />
            <h2 className="font-semibold">Payment History & Receipts</h2>
            <span className="ml-auto text-xs text-zinc-400">{receipts.length} record{receipts.length === 1 ? "" : "s"}</span>
          </div>
          {rq.isLoading && <p className="text-zinc-400 text-sm">Loading…</p>}
          {!rq.isLoading && receipts.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No payment receipts yet.</p>
          )}
          <div className="space-y-2">
            {receipts.map((r: any) => (
              <div key={r.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-amber-300">{r.receipt_number}</span>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 text-[10px]">
                      {(r.status || "paid").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Paid {fmtDate(r.paid_on)} · Valid till {fmtDate(r.period_end)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmtAmount(r.amount, r.currency)}</div>
                  <div className="text-[10px] uppercase text-zinc-500">{r.payment_method || "—"}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600/60 text-amber-100 hover:bg-amber-950/40"
                  onClick={() => printReceipt(org, r)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
