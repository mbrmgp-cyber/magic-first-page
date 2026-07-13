import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { localizeText, useI18n } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";
import {
  listAuctionPayments,
  uploadAuctionPayment,
  verifyAuctionPayment,
  getPaymentReceiptSignedUrl,
  type PaymentDTO,
} from "@/lib/auction.functions";

type Props = {
  orgId: string;
  auctionId: string | null;
  monthNo: number;
  amount: number;
  isAdmin: boolean;
};

export function AuctionPaymentsPanel({ orgId, auctionId, monthNo, amount, isAdmin }: Props) {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const listFn = useServerFn(listAuctionPayments);
  const uploadFn = useServerFn(uploadAuctionPayment);
  const verifyFn = useServerFn(verifyAuctionPayment);
  const signedFn = useServerFn(getPaymentReceiptSignedUrl);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    if (!auctionId) return;
    try {
      const res: any = await listFn({ data: { orgId, auctionId, monthNo } });
      setPayments(res?.payments ?? []);
    } catch (e: any) {
      // silent
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [orgId, auctionId, monthNo]);

  useEffect(() => {
    if (!auctionId) return;
    const ch = supabase
      .channel(`payments-${auctionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_payments", filter: `auction_id=eq.${auctionId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [auctionId]);

  const doUpload = async () => {
    if (!auctionId) return toast.error("No active auction");
    const file = fileRef.current?.files?.[0];
    let receiptUrl: string | null = null;
    setUploading(true);
    try {
      if (file) {
        const path = `${orgId}/${auctionId}/${monthNo}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("chit-receipts").upload(path, file, { upsert: false });
        if (error) throw error;
        receiptUrl = path;
      }
      await uploadFn({ data: { orgId, auctionId, monthNo, amount, receiptUrl, note: note || null } });
      toast.success(lt("Receipt submitted for verification", "రసీదు ధృవీకరణకు పంపబడింది"));
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setStatus = async (p: PaymentDTO, status: "verified" | "rejected" | "pending") => {
    try {
      await verifyFn({ data: { orgId, paymentId: p.id, status } });
      toast.success(`Marked ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  const openReceipt = async (p: PaymentDTO) => {
    if (!p.receipt_url) return;
    try {
      const res: any = await signedFn({ data: { path: p.receipt_url } });
      if (res?.url) window.open(res.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Could not open receipt");
    }
  };

  return (
    <Card className="p-4 space-y-3 bg-card">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-amber-400" />
        <h3 className="font-semibold text-sm">{lt("Payments", "చెల్లింపులు")} ({lt("Month", "నెల")} {monthNo})</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">{payments.length} {lt("entries", "నమోదులు")}</Badge>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <Input ref={fileRef} type="file" accept="image/*,application/pdf" className="h-9 text-xs" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={lt("Note (txn id, mode)", "గమనిక (ట్రాన్సాక్షన్ ఐడి, విధానం)")} className="h-9 text-xs" />
          <Button onClick={doUpload} disabled={uploading} size="sm" className="gap-1.5">
            <Upload className="size-3.5" /> {lt("Submit", "సమర్పించండి")}
          </Button>
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-auto">
        {payments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">{lt("No receipts yet.", "ఇంకా రసీదులు లేవు.")}</p>
        )}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-background/50 p-2 text-xs">
            <span className="font-mono opacity-70 w-16 truncate">{p.member_code || "—"}</span>
            <span className="flex-1 truncate">{p.member_name || "Member"}</span>
            <span className="tabular-nums font-semibold">₹{Number(p.amount).toLocaleString("en-IN")}</span>
            {p.status === "verified" && <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 gap-1"><CheckCircle2 className="size-3" />{lt("Verified", "ధృవీకరించబడింది")}</Badge>}
            {p.status === "rejected" && <Badge className="bg-red-500/15 text-red-400 border border-red-500/40 gap-1"><XCircle className="size-3" />{lt("Rejected", "తిరస్కరించబడింది")}</Badge>}
            {p.status === "pending" && <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/40 gap-1"><Clock className="size-3" />{lt("Pending", "పెండింగ్")}</Badge>}
            {p.receipt_url && (
              <Button size="sm" variant="ghost" onClick={() => openReceipt(p)} className="h-7 px-2 text-[11px]">{lt("View", "చూడండి")}</Button>
            )}
            {isAdmin && p.status !== "verified" && (
              <Button size="sm" onClick={() => setStatus(p, "verified")} className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700">{lt("Verify", "ధృవీకరించండి")}</Button>
            )}
            {isAdmin && p.status !== "rejected" && (
              <Button size="sm" variant="destructive" onClick={() => setStatus(p, "rejected")} className="h-7 px-2 text-[11px]">{lt("Reject", "తిరస్కరించండి")}</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
