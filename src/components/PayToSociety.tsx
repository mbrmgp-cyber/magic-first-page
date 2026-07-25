import { Button } from "@/components/ui/button";
import { Building2, Copy } from "lucide-react";
import { toast } from "sonner";

export function PayToSociety({
  org,
  brand,
  b,
}: {
  org: any;
  brand: string;
  b: (te: string, en: string) => string;
}) {
  const holder = org?.bank_account_holder || org?.name || "";
  const bankName = org?.bank_name || "";
  const branch = org?.bank_branch || "";
  const acc = org?.bank_account_number || "";
  const ifsc = org?.bank_ifsc || "";
  const hasAny = !!(bankName || acc || ifsc || branch);

  const copy = (val: string, label: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed")
    );
  };

  if (!hasAny) {
    return (
      <div className="text-center text-white/70 text-sm py-6">
        {b(
          "సొసైటీ బ్యాంక్ వివరాలు ఇంకా జోడించబడలేదు. దయచేసి admin ను సంప్రదించండి.",
          "Society bank details are not added yet. Please contact your admin."
        )}
      </div>
    );
  }

  const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-black/40 border border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
          <p className={`text-sm text-white truncate ${mono ? "font-mono" : "font-semibold"}`}>{value}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => copy(value, label)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl p-3 border" style={{ borderColor: `${brand}55`, background: `${brand}12` }}>
        <p className="text-[11px] uppercase tracking-wide text-white/60">{b("చెల్లింపు కోసం", "Pay to")}</p>
        <p className="text-base font-bold" style={{ color: brand }}>{holder || "—"}</p>
      </div>

      <Row label={b("బ్యాంక్ పేరు", "Bank Name")} value={bankName} />
      <Row label={b("బ్రాంచ్", "Branch")} value={branch} />
      <Row label={b("ఖాతా నంబర్", "Account Number")} value={acc} mono />
      <Row label={b("IFSC కోడ్", "IFSC Code")} value={ifsc} mono />

      <p className="text-[11px] text-white/50 text-center pt-1">
        {b(
          "చెల్లింపు తర్వాత admin కు screenshot / రిఫరెన్స్ నంబర్ పంపించండి.",
          "After paying, share the screenshot / reference number with admin."
        )}
      </p>
    </div>
  );
}

export function PayToSocietyButton({
  onClick,
  brand,
  b,
}: {
  onClick: () => void;
  brand: string;
  b: (te: string, en: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center gap-3 transition hover:-translate-y-0.5"
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${brand}99`; e.currentTarget.style.boxShadow = `0 0 20px ${brand}33`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${brand}26` }}>
        <Building2 className="h-5 w-5" style={{ color: brand }} />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-white">{b("సొసైటీకి పేమెంట్", "Pay to Society")}</p>
        <p className="text-[11px] text-white/60">{b("బ్యాంక్ వివరాలు చూడండి", "View bank details")}</p>
      </div>
    </button>
  );
}
