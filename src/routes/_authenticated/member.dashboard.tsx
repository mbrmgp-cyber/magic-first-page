import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyMembership } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MemberIdCard } from "@/components/MemberIdCard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n, transliterateText } from "@/lib/i18n";
import {
  LogOut, IdCard, BookOpen, Wallet, Briefcase, MessageSquare, Vote, ShieldCheck, User, ScanLine,
  Facebook, Youtube, Gavel, CalendarDays,
} from "lucide-react";

const SOCIAL_LINKS = [
  {
    label: "WhatsApp Group",
    te: "వాట్సాప్ గ్రూప్",
    href: "https://chat.whatsapp.com/IvY1bPI92PxFU56iIXG7xD",
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 32 32" className="h-6 w-6" fill="#25D366" color="#25D366" aria-hidden="true">
        <path fill="#25D366" d="M19.11 17.21c-.29-.14-1.7-.84-1.96-.94-.26-.1-.46-.14-.65.15-.19.29-.74.94-.91 1.13-.17.19-.34.22-.62.07-.29-.14-1.21-.45-2.31-1.43-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.65-1.57-.89-2.15-.24-.57-.48-.49-.65-.5-.17-.01-.36-.01-.55-.01-.19 0-.51.07-.77.36-.26.29-1.01.99-1.01 2.41 0 1.42 1.04 2.8 1.18 2.99.14.19 2.04 3.12 4.94 4.37.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33zM16 4C9.37 4 4 9.37 4 16c0 2.11.55 4.16 1.6 5.97L4 28l6.18-1.62A11.94 11.94 0 0016 28c6.63 0 12-5.37 12-12S22.63 4 16 4z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    te: "ఫేస్‌బుక్",
    href: "https://www.facebook.com/share/1EjpbZiniJ/",
    color: "#1877F2",
    icon: <Facebook className="h-6 w-6" style={{ color: "#1877F2", fill: "#1877F2", stroke: "#1877F2" }} fill="#1877F2" strokeWidth={0} />,
  },
  {
    label: "YouTube",
    te: "యూట్యూబ్",
    href: "https://youtube.com/@chitvelhelplinesociety",
    color: "#FF0000",
    icon: <Youtube className="h-6 w-6" style={{ color: "#FF0000", fill: "#FF0000", stroke: "#FF0000" }} fill="#FF0000" strokeWidth={0} />,
  },
] as const;
import QRCode from "qrcode";

export const Route = createFileRoute("/_authenticated/member/dashboard")({
  head: () => ({ meta: [{ title: "Member Dashboard — MBR App" }] }),
  component: MemberDashboard,
});

const MENU = [
  { label: "Society Rules", te: "సంస్థ నియమాలు", icon: BookOpen, to: "/org/rules" },
  { label: "Financial Ledger", te: "ఆర్థిక వివరాలు", icon: Wallet, to: "/member/ledger" },
  { label: "Request Loan", te: "అప్పు కొరకు అభ్యర్థన", icon: Wallet, to: "/member/loan-request" },
  { label: "Live Chit Auction", te: "లైవ్ చిట్ ఆక్షన్", icon: Gavel, to: "/org/auction" },
  { label: "Committee Details", te: "కార్య వర్గ వివరాలు", icon: Briefcase, to: "/org/committee" },
  { label: "Chat", te: "చాటింగ్ / సందేశాలు", icon: MessageSquare, to: "/org/chat" },
  { label: "Events & Decisions", te: "కార్యక్రమాలు & నిర్ణయాలు", icon: CalendarDays, to: "/member/events" },
  { label: "Elections", te: "ఎన్నికలు", icon: Vote, to: "/org/elections" },
] as const;

function MemberDashboard() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyMembership);
  const meQ = useQuery({ queryKey: ["my-membership"], queryFn: () => fetchMe() });
  const [qrUrl, setQrUrl] = useState<string>("");
  const [qrTargetUrl, setQrTargetUrl] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoBroken, setPhotoBroken] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const { lang } = useI18n();
  const tr = (s: string) => transliterateText(s, lang);


  const m: any = meQ.data?.membership;
  const org = m?.organizations;
  const orgId: string | undefined = org?.id ?? m?.org_id;
  const brand = (org?.theme_color as string) || "#ff8c28";
  const fontFamily = (org?.theme_font as string) || "Inter";

  const chatActivityQ = useQuery({
    queryKey: ["chat-activity-latest", orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!orgId) return 0;
      const [{ data: ann }, { data: mtg }] = await Promise.all([
        supabase.from("chat_announcements").select("created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
        supabase.from("org_meetings").select("created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
      ]);
      const times = [ann?.[0]?.created_at, mtg?.[0]?.created_at]
        .filter((t): t is string => !!t)
        .map((t) => new Date(t).getTime());
      return times.length ? Math.max(...times) : 0;
    },
  });
  const [chatSeenAt, setChatSeenAt] = useState<number>(0);
  useEffect(() => {
    if (!orgId) return;
    try {
      const raw = localStorage.getItem(`chat.lastSeenAt.${orgId}`);
      setChatSeenAt(raw ? new Date(raw).getTime() : 0);
    } catch { setChatSeenAt(0); }
  }, [orgId]);
  const hasNewChat = !!chatActivityQ.data && chatActivityQ.data > chatSeenAt;

  useEffect(() => {
    if (!org) { setQrUrl(""); return; }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const code = (org as any)?.org_code ?? "";
    const target = origin ? `${origin}/member/register${code ? `?code=${encodeURIComponent(code)}` : ""}` : "";
    setQrTargetUrl(target);
    QRCode.toDataURL(target || "https://mbrplatform.com/member/register", { width: 256, margin: 2, color: { dark: "#111111", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [org, brand]);

  useEffect(() => {
    setPhotoBroken(false);
    setPhotoUrl("");
    const path = m?.photo_url;
    if (!path) return;
    // Already an absolute URL? use it directly.
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
      setPhotoUrl(path);
      return;
    }
    let cancel = false;
    supabase.storage.from("member-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancel && data?.signedUrl) setPhotoUrl(data.signedUrl);
    });
    return () => { cancel = true; };
  }, [m?.photo_url]);

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
  if (m.is_active === false) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          <div className="text-3xl">⏸️</div>
          <h2 className="text-lg font-semibold">మీ సభ్యత్వం ప్రస్తుతం Inactive గా ఉంది</h2>
          <p className="text-sm text-white/70">
            Your membership has been marked Inactive by the organization. You will not receive
            any updates until your membership is reactivated. Please contact the organization admin.
          </p>
          <button onClick={logout} className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
            Logout
          </button>
        </div>
      </div>
    );
  }

  const firstName = m.first_name ?? (m.name?.split(" ")[0] ?? "");
  const lastName = m.last_name ?? (m.name?.split(" ").slice(1).join(" ") ?? "");
  const fullName = `${firstName} ${lastName}`.trim();
  const showPhoto = !!photoUrl && !photoBroken;

  const themeStyle = {
    ["--brand" as any]: brand,
    fontFamily: `${fontFamily}, system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-black text-white" style={themeStyle} translate="no">
      <div className="max-w-md mx-auto p-4 space-y-5" translate="no">

        {/* Top header: society logo + welcome + society QR */}
        <header className="flex items-start justify-between gap-3">
          <div className="h-14 w-14 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-white/20">
            {org?.logo_url
              ? <img src={org.logo_url} alt="" className="h-full w-full object-contain p-1" />
              : <ShieldCheck className="h-7 w-7 text-black" />}
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold text-white leading-tight text-center">{tr("స్వాగతం గౌరవ సభ్యులకు")} 🙏</p>
            <LanguageToggle />
          </div>
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center overflow-hidden shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}4d` }}>
            {qrUrl
              ? <a href={qrTargetUrl || "/member/register"} aria-label="Open society registration QR" className="h-full w-full block rounded-xl bg-white p-1">
                  <img src={qrUrl} alt="Society QR" className="h-full w-full object-contain" />
                </a>
              : <ScanLine className="h-7 w-7" style={{ color: brand }} />}
          </div>
        </header>

        {/* Society Advertisement Banner — auto-hides when no active banners */}
        <AdBannerSlot orgId={orgId} banners={(org as any)?.ad_banners as any[] | undefined} brand={brand} />


        {/* Profile layout: photo + names */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 flex items-center gap-4">
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}66` }}>
            {showPhoto ? (
              <img
                src={photoUrl}
                alt={fullName}
                className="h-full w-full object-cover"
                onError={() => setPhotoBroken(true)}
              />
            ) : (
              <User className="h-12 w-12 text-zinc-600" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-2xl font-bold text-white truncate leading-tight">{firstName || "—"}</p>
            <p className="text-2xl font-bold text-white truncate leading-tight mt-1">{lastName || "—"}</p>
          </div>
        </Card>

        {/* 2-column grid menu */}
        <div className="grid grid-cols-2 gap-3">
          {/* ID Card opens dialog */}
          <button
            type="button"
            onClick={() => setIdCardOpen(true)}
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center gap-2.5 text-center transition hover:-translate-y-0.5 min-h-[112px]"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${brand}99`; e.currentTarget.style.boxShadow = `0 0 20px ${brand}33`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <div className="h-11 w-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brand}26` }}>
              <IdCard className="h-5 w-5" style={{ color: brand }} />
            </div>
            <p className="text-[14px] font-semibold text-white leading-tight">{tr("సభ్యుడి ఐడి కార్డ్")}</p>
          </button>

          {MENU.map((it) => {
            const showDot = it.to === "/org/chat" && hasNewChat;
            return (
            <Link key={it.label} to={it.to as any}
              className="relative rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center gap-2.5 text-center transition hover:-translate-y-0.5 min-h-[112px]"
              style={{ ["--brand" as any]: brand } as React.CSSProperties}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${brand}99`; e.currentTarget.style.boxShadow = `0 0 20px ${brand}33`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}>
              <div className="h-11 w-11 rounded-full flex items-center justify-center relative"
                style={{ backgroundColor: `${brand}26` }}>
                <it.icon className="h-5 w-5" style={{ color: brand }} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-black animate-pulse" aria-label="New message" />
                )}
              </div>
              <p className="text-[14px] font-semibold text-white leading-tight">{tr(it.te)}</p>
            </Link>
            );
          })}
          <button onClick={logout}
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center gap-2.5 text-center hover:border-zinc-600 transition min-h-[112px]">
            <div className="h-11 w-11 rounded-full bg-zinc-900 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-[14px] font-semibold text-white">{tr("లాగ్ అవుట్")}</p>
          </button>
        </div>

        {/* Social Media / Connect with Us */}
        <Card className="bg-zinc-950 border-zinc-800 p-4"
          style={{ boxShadow: `0 0 24px ${brand}1f` }}>
          <div className="text-center mb-3">
            <p className="text-sm font-semibold text-white">{tr("మాతో కనెక్ట్ అవ్వండి")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center text-white transition hover:-translate-y-0.5 border"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderColor: `${s.color}66`,
                }}
                aria-label={s.label}
              >
                <span className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}>
                  {s.icon}
                </span>
                <p className="text-[12px] font-semibold leading-tight text-white">{s.te}</p>
              </a>
            ))}
          </div>
        </Card>
      </div>


      <Dialog open={idCardOpen} onOpenChange={setIdCardOpen}>
        <DialogContent className="max-w-[480px] p-4 bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">సభ్యుడి ID కార్డ్</DialogTitle>
          </DialogHeader>
          <MemberIdCard member={m} org={org} />
        </DialogContent>
      </Dialog>

    </div>
  );
}


type AdBanner = { url: string; active?: boolean; label?: string | null };

function AdBannerSlot({ orgId, banners, brand }: { orgId?: string; banners?: AdBanner[]; brand: string }) {
  const active = (banners || []).filter((b) => b && b.url && b.active !== false);
  const [signed, setSigned] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const urls = await Promise.all(active.map(async (b) => {
        if (/^https?:\/\//i.test(b.url) || b.url.startsWith("data:")) return b.url;
        // storage path within org-ads bucket
        const { data } = await supabase.storage.from("org-ads").createSignedUrl(b.url, 3600);
        return data?.signedUrl || "";
      }));
      if (!cancelled) setSigned(urls.filter(Boolean));
    }
    if (active.length) resolve(); else setSigned([]);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, JSON.stringify(active.map((b) => b.url))]);

  useEffect(() => {
    if (signed.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % signed.length), 5000);
    return () => clearInterval(t);
  }, [signed.length]);

  if (!signed.length) return null;
  const current = signed[idx % signed.length];

  return (
    <div className="rounded-2xl overflow-hidden border relative"
      style={{ borderColor: `${brand}4d`, boxShadow: `0 0 24px ${brand}22` }}>
      <img
        src={current}
        alt="Society advertisement"
        className="w-full h-[70px] object-cover block transition-opacity duration-500"
      />

      {signed.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {signed.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 5,
                background: i === idx ? brand : "rgba(255,255,255,0.6)",
              }} />
          ))}
        </div>
      )}
    </div>
  );
}



