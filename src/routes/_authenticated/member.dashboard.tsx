import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyMembership } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  LogOut, IdCard, BookOpen, Wallet, Briefcase, MessageSquare, ShieldCheck, User, ScanLine,
} from "lucide-react";
import QRCode from "qrcode";

export const Route = createFileRoute("/_authenticated/member/dashboard")({
  head: () => ({ meta: [{ title: "Member Dashboard — MBR App" }] }),
  component: MemberDashboard,
});

const MENU = [
  { label: "ID Card", te: "సభ్యుడి ఐడి కార్డ్", icon: IdCard, to: "/member/pending" },
  { label: "Society Rules", te: "సంస్థ నియమాలు", icon: BookOpen, to: "/member/pending" },
  { label: "Financial Ledger", te: "ఆర్థిక వివరాలు", icon: Wallet, to: "/member/ledger" },
  { label: "Committee Details", te: "కార్య వర్గ వివరాలు", icon: Briefcase, to: "/member/pending" },
  { label: "Chat & Elections", te: "చాటింగ్ మరియు ఎలక్షన్", icon: MessageSquare, to: "/member/pending" },
] as const;

function MemberDashboard() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyMembership);
  const meQ = useQuery({ queryKey: ["my-membership"], queryFn: () => fetchMe() });
  const [qrUrl, setQrUrl] = useState<string>("");
  const [photoBroken, setPhotoBroken] = useState(false);

  const m: any = meQ.data?.membership;
  const org = m?.organizations;
  const brand = (org?.theme_color as string) || "#ff8c28";
  const fontFamily = (org?.theme_font as string) || "Inter";

  useEffect(() => {
    const code = org?.letter_code ?? "";
    if (!code) { setQrUrl(""); return; }
    QRCode.toDataURL(code, { width: 256, margin: 1, color: { dark: brand, light: "#00000000" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [org?.letter_code, brand]);

  useEffect(() => { setPhotoBroken(false); }, [m?.photo_url]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (meQ.isLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;
  }
  if (!m || m.status !== "approved") {
    if (typeof window !== "undefined") navigate({ to: "/member/pending", replace: true });
    return null;
  }

  const firstName = m.first_name ?? (m.name?.split(" ")[0] ?? "");
  const lastName = m.last_name ?? (m.name?.split(" ").slice(1).join(" ") ?? "");
  const fullName = `${firstName} ${lastName}`.trim();
  const showPhoto = !!m.photo_url && !photoBroken;

  const themeStyle = {
    ["--brand" as any]: brand,
    fontFamily: `${fontFamily}, system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-black text-white pb-12" style={themeStyle}>
      <div className="max-w-md mx-auto p-4 space-y-5">
        {/* Top header: society logo + welcome + society QR */}
        <header className="flex items-start justify-between gap-3">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden flex items-center justify-center shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}4d` }}>
            {org?.logo_url
              ? <img src={org.logo_url} alt="" className="h-full w-full object-cover" />
              : <ShieldCheck className="h-7 w-7" style={{ color: brand }} />}
          </div>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[11px] text-zinc-400">Welcome / నమస్కారం</p>
            <p className="text-sm font-semibold text-white truncate">{fullName}</p>
          </div>
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center overflow-hidden shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}4d` }}>
            {qrUrl
              ? <img src={qrUrl} alt="Society QR" className="h-full w-full object-contain p-1" />
              : <ScanLine className="h-7 w-7" style={{ color: brand }} />}
          </div>
        </header>

        {/* Sub-header — hardcoded society name */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 text-center"
          style={{ boxShadow: `0 0 24px ${brand}1f` }}>
          <p className="text-sm text-white leading-snug">
            చిట్వేల్ హెల్ప్ లైన్ సొసైటీ యొక్క విలువైన సభ్యుడి వివరాలు
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Valued Member Details of Chitvel Help Line Society
          </p>
        </Card>

        {/* Profile layout: photo + names */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 flex items-center gap-4">
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}66` }}>
            {showPhoto ? (
              <img
                src={m.photo_url}
                alt={fullName}
                className="h-full w-full object-cover"
                onError={() => setPhotoBroken(true)}
              />
            ) : (
              <User className="h-12 w-12 text-zinc-600" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">First Name / పేరు</p>
            <p className="text-xl font-bold text-white truncate">{firstName || "—"}</p>
            <p className="text-[11px] text-zinc-400 mt-2">Last Name / ఇంటి పేరు</p>
            <p className="text-xl font-bold text-white truncate">{lastName || "—"}</p>
          </div>
        </Card>

        {/* 2-column grid menu */}
        <div className="grid grid-cols-2 gap-3">
          {MENU.map((it) => (
            <Link key={it.label} to={it.to as any}
              className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center gap-2 text-center transition hover:-translate-y-0.5"
              style={{ ["--brand" as any]: brand } as React.CSSProperties}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${brand}99`; e.currentTarget.style.boxShadow = `0 0 20px ${brand}33`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}>
              <div className="h-11 w-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${brand}26` }}>
                <it.icon className="h-5 w-5" style={{ color: brand }} />
              </div>
              <p className="text-[13px] font-semibold text-white leading-tight">{it.label}</p>
              <p className="text-[10px] text-zinc-400 leading-tight">{it.te}</p>
            </Link>
          ))}
          <button onClick={logout}
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center gap-2 text-center hover:border-zinc-600 transition">
            <div className="h-11 w-11 rounded-full bg-zinc-900 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-[13px] font-semibold text-white">Logout</p>
            <p className="text-[10px] text-zinc-400">లాగ్ అవుట్</p>
          </button>
        </div>
      </div>
    </div>
  );
}
