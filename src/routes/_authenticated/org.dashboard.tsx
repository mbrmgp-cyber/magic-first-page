import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getMyOrg, updateOrgLogo, getMyRoles, getMyCommitteeAccess } from "@/lib/org.functions";
import { getMyModules } from "@/lib/admin-permissions.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut, BookOpen, Users, Briefcase, Calendar, IdCard, Wallet,
  MessageSquare, QrCode, Camera, Download, RefreshCw, Settings, AlertTriangle,
  Upload, ShieldAlert, FileDown, CheckCircle2, Vote, TrendingUp, TrendingDown, PieChart, ShieldCheck, Gavel,
  User, KeyRound, Receipt,
} from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { localizeText, transliterateText, useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { resolveTheme } from "@/lib/theme";
import { memberRegistrationUrl } from "@/lib/public-url";
import { useSimRole, canAccess, ROUTE_ACCESS, ROLE_LABELS } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Society Dashboard — MBR App" }] }),
  component: Dashboard,
});

const MENU = [
  { to: "/org/rules", key: "rules", en: "Society Rules & History", te: "సొసైటీ నియమావళి & చరిత్ర", icon: BookOpen },
  { to: "/org/members", key: "members", en: "Members & Registration", te: "సభ్యులు & నమోదు", icon: Users },
  { to: "/org/committee", key: "committee", en: "Executive Committee", te: "కార్యనిర్వాహక కమిటీ", icon: Briefcase },
  { to: "/org/events", key: "events", en: "Events, Meetings, Decisions", te: "సమావేశాలు & నిర్ణయాలు", icon: Calendar },
  { to: "/org/designs", key: "designs", en: "ID Cards, Mementos, Letterhead, Stamp Design", te: "ID కార్డులు, మెమెంటోలు, లెటర్‌ప్యాడ్, స్టాంప్ డిజైన్", icon: IdCard },
  { to: "/org/accounts-hub", key: "accounts", en: "Accounts Hub", te: "అకౌంట్స్ బాక్స్", icon: Wallet },
  { to: "/org/chat", key: "chat", en: "Member Chat", te: "సభ్యులతో చాటింగ్", icon: MessageSquare },
  { to: "/org/elections", key: "elections", en: "Board Elections", te: "బోర్డు ఎన్నికలు", icon: Vote },
  { to: "/org/auction", key: "auction", en: "Live Chit Auction", te: "లైవ్ చిట్ ఆక్షన్", icon: Gavel },
  { to: "/org/disciplinary", key: "disciplinary", en: "Disciplinary Committee", te: "క్రమశిక్షణా కమిటీ", icon: ShieldAlert },
] as const;


function MetricItem({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 px-1.5">
      <p className="text-[9px] uppercase tracking-wide text-[#ff8c28] font-semibold leading-tight break-words">{label}</p>
      {sub && <p className="text-[9px] text-zinc-400 leading-tight break-words">{sub}</p>}
      <p className="mt-1 text-sm md:text-base font-bold text-white truncate">{value}</p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const saveLogo = useServerFn(updateOrgLogo);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const fetchRoles = useServerFn(getMyRoles);
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const fetchCommittee = useServerFn(getMyCommitteeAccess);
  const committeeQ = useQuery({ queryKey: ["my-committee-access"], queryFn: () => fetchCommittee() });
  const fetchModules = useServerFn(getMyModules);
  const modulesQ = useQuery({ queryKey: ["my-modules"], queryFn: () => fetchModules() });
  const { role: simRole } = useSimRole();
  const isMbrAdmin = (rolesQ.data?.roles?.includes("mbr_admin") ?? false) && simRole === "super_admin";
  const isSuperAdmin = modulesQ.data?.isSuperAdmin ?? false;
  const allowed = new Set(modulesQ.data?.modules ?? []);
  // Committee admins see the same tile layout as the Super Admin.
  // Per-module permissions are still enforced on click by ModuleRouteGuard.
  void allowed;
  const visibleMenu = MENU.filter((m) => canAccess(simRole, ROUTE_ACCESS[m.to] ?? "dashboard"));
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2 | 3>(1);
  const [resolutionUrl, setResolutionUrl] = useState<string>("");
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function leaveOrganization() {
    setLeaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("members").delete().eq("user_id", user.id);
      if (error) throw error;
      toast.success("మీరు సంస్థ నుండి విజయవంతంగా వైదొలిగారు");
      setLeaveOpen(false);
      setSettingsOpen(false);
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to leave organization");
    } finally {
      setLeaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function onLogoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = f.name.split(".").pop() || "png";
      const path = `${user.id}/logo/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-documents").upload(path, f, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("URL generation failed");
      await saveLogo({ data: { logo_url: url } });
      await qc.invalidateQueries({ queryKey: ["my-org"] });
      toast.success("లోగో అప్‌డేట్ అయింది");
    } catch (err: any) {
      toast.error(err.message ?? "అప్‌లోడ్ విఫలమైంది");
    } finally {
      setUploading(false);
    }
  }

  async function exportData() {
    if (!orgQ.data?.org) return;
    setExporting(true);
    try {
      const orgId = orgQ.data.org.id;
      const [members, committee, rules, events] = await Promise.all([
        supabase.from("members").select("*").eq("org_id", orgId),
        supabase.from("committee_members").select("*").eq("org_id", orgId),
        supabase.from("org_rules").select("*").eq("org_id", orgId),
        supabase.from("org_milestones").select("*").eq("org_id", orgId),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        organization: orgQ.data.org,
        members: members.data ?? [],
        committee_members: committee.data ?? [],
        rules: rules.data ?? [],
        events: events.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${orgQ.data.org.org_code}-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lt("Data downloaded", "డేటా డౌన్‌లోడ్ అయింది"));
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function uploadResolution(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setResolutionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = f.name.split(".").pop() || "bin";
      const path = `${user.id}/cancellation/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("org-documents").upload(path, f, { upsert: false });
      if (error) throw error;
      const { data } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      setResolutionUrl(data?.signedUrl ?? path);
      toast.success(lt("Resolution uploaded", "తీర్మానం పత్రం అప్‌లోడ్ అయింది"));
    } catch (err: any) {
      toast.error(err.message ?? lt("Upload failed", "అప్‌లోడ్ విఫలమైంది"));
    } finally {
      setResolutionBusy(false);
    }
  }

  async function confirmCancellation() {
    setConfirming(true);
    try {
      // Mark org as cancellation-requested by writing approval_notes (non-destructive flag).
      if (orgQ.data?.org) {
        await supabase.from("organizations").update({
          approval_notes: `[CANCELLATION_REQUESTED ${new Date().toISOString()}] Resolution: ${resolutionUrl}`,
        }).eq("id", orgQ.data.org.id);
      }
      toast.success(lt("Cancellation request recorded. 30-day grace period started.", "రద్దు అభ్యర్థన నమోదు అయింది. 30 రోజుల గ్రేస్ పీరియడ్ ప్రారంభమైంది."));
      setCancelOpen(false);
      setSettingsOpen(false);
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? lt("Failed", "విఫలమైంది"));
    } finally {
      setConfirming(false);
    }
  }

  if (orgQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>;

  const org = orgQ.data?.org;
  const qrDataUrl = orgQ.data?.qrDataUrl;
  if (!org) {
    const reLogin = async () => {
      try { await supabase.auth.signOut(); } catch {}
      navigate({ to: "/auth", replace: true });
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <Card className="p-6 text-center space-y-4 bg-zinc-950 border-zinc-800 text-white max-w-sm">
          <div>
            <p className="font-semibold">{lt("You have no Organization.", "మీకు Organization లేదు.")}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {lt(
                "You may be signed in with a different email. Please log in again with the correct Org Admin email.",
                "మీరు వేరే email తో login అయి ఉండవచ్చు. సరైన Org Admin email తో మళ్ళీ login అవ్వండి."
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={reLogin} variant="default" className="!bg-[#ff8c28] hover:!bg-[#ff8c28]/90 !text-white font-bold border-2 !border-white shadow-[0_0_16px_rgba(255,140,40,0.55)]">
              <LogOut className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">{lt("Re-Login", "మళ్ళీ లాగిన్")}</span>
            </Button>
            <Button onClick={() => navigate({ to: "/org/register" })} variant="outline" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
              {lt("Register New Org", "కొత్త Org నమోదు చేయండి")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (org.approval_status !== "approved") {
    const pending = org.approval_status === "pending";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <Card className="w-full max-w-md p-6 text-center space-y-4 bg-zinc-950 border-zinc-800 text-white shadow-[0_0_60px_rgba(255,140,40,0.15)]">
          <img src={mbrLogo.url} alt="MBR" className="w-16 h-16 mx-auto rounded-md bg-black p-1.5" />
          <h2 className="text-xl font-bold">{pending ? lt("Under MBR Review", "MBR సమీక్షలో ఉంది") : lt("Application Rejected", "దరఖాస్తు తిరస్కరించబడింది")}</h2>
          {pending ? (
            <>
              <p className="text-sm text-zinc-400">
                {lt(
                  "MBR admin is reviewing your society registration. Approval will be sent by email after logo, government registration, and founders ID verification.",
                  "మీ సొసైటీ నమోదును MBR అడ్మిన్ సమీక్షిస్తున్నారు. లోగో, ప్రభుత్వ నమోదు, వ్యవస్థాపకుల ID ధృవీకరణ తర్వాత ఈమెయిల్ ద్వారా ఆమోదం వస్తుంది."
                )}
              </p>
              <div className="text-xs bg-[#ff8c28]/10 border border-[#ff8c28]/40 rounded-md p-3 text-[#ffb072]">
                {lt("Status", "స్థితి")}: <span className="font-bold">{lt("PENDING REVIEW", "సమీక్షలో ఉంది")}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-red-400">{lt("Your application was rejected.", "మీ దరఖాస్తు తిరస్కరించబడింది.")}</p>
              {org.approval_notes && (
                <div className="text-xs bg-red-950 border border-red-900 rounded-md p-3 text-red-200 text-left">
                  <strong>{lt("Reason", "కారణం")}:</strong> {org.approval_notes}
                </div>
              )}
            </>
          )}
          <Button onClick={logout} variant="outline" className="w-full border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
            <LogOut className="h-4 w-4 mr-2" />{lt("Logout", "లాగ్ అవుట్")}
          </Button>
        </Card>
      </div>
    );
  }

  const theme = resolveTheme(org);
  const registrationUrl = memberRegistrationUrl(org.org_code);
  return (
    <div className="min-h-screen p-3 md:p-6"
      style={{
        backgroundColor: theme.bg,
        color: theme.headColor,
        fontFamily: `${theme.headFont}, system-ui, sans-serif`,
      }}>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoPicked} />
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-1.5 flex-nowrap">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="w-10 h-10 shrink-0 rounded-md bg-zinc-950 border border-zinc-800 shadow-[0_0_20px_rgba(255,140,40,0.2)] flex items-center justify-center overflow-hidden hover:scale-105 transition"
              aria-label={lt("Society QR Code", "సొసైటీ QR కోడ్")}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Society QR" className="w-full h-full object-contain p-0.5 bg-white" />
              ) : (
                <QrCode className="w-5 h-5 text-zinc-500" />
              )}
            </button>
            <LanguageToggle />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="text-zinc-200 hover:bg-zinc-900 hover:text-white h-9 w-9 p-0 rounded-md border border-zinc-700 inline-flex items-center justify-center shrink-0 [&_svg]:mx-auto" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 flex-nowrap justify-end min-w-0">
            <Button variant="ghost" size="sm" onClick={logout} className="text-zinc-200 hover:bg-zinc-900 hover:text-white px-2 h-9 rounded-md border border-zinc-700 shrink-0">
              <LogOut className="h-4 w-4 mr-1" />{lt("Logout", "లాగ్ అవుట్")}
            </Button>
            <img src={mbrLogo.url} alt="MBR" data-mbr-logo className="w-10 h-10 shrink-0 rounded-md border border-zinc-800 object-contain p-0.5" style={{ backgroundColor: "#000" }} />
          </div>

        </div>




        {/* Society headline card */}
        <Card className="p-4 border" style={{ background: theme.bigBox, borderColor: theme.border, boxShadow: `0 0 40px ${theme.icon}1a` }}>
          <div className={`flex items-start gap-4 ${theme.headAlign === "right" ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-20 h-20 shrink-0 rounded-full flex items-center justify-center overflow-hidden group border"
              style={{ background: theme.bg, borderColor: theme.border }}
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt={`${org.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: theme.smallColor }}>
                  {((lang === "en" && org.name_en) ? org.name_en : org.name).split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 bg-black/60 text-white text-[10px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5 mb-0.5" />{lt("Change", "మార్చండి")}</>}
              </span>
            </button>
            <div className="min-w-0 flex-1" style={{ textAlign: theme.headAlign }}>
              <h1 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: "clamp(0.95rem, 4.6vw, 1.6rem)", color: theme.headColor, fontFamily: `${theme.headFont}, system-ui, sans-serif` }}>
                {lang === "en" && org.name_en ? org.name_en : transliterateText(org.name, lang)}
              </h1>
              {org.slogan && <p className="mt-1 italic" style={{ color: theme.subColor, fontFamily: `${theme.subFont}, system-ui, sans-serif` }}>{transliterateText(org.slogan, lang)}</p>}
              {org.gov_reg_number && (
                <p className="mt-1" style={{ color: theme.smallColor, fontSize: theme.smallSize }}>
                  {lt("Reg No", "నమోదు సంఖ్య")}: <span className="font-mono" style={{ color: theme.icon }}>{org.gov_reg_number}</span>
                </p>
              )}
            </div>
          </div>
        </Card>


        {/* Super Admin shortcut */}
        {isMbrAdmin && (
          <Link to="/admin" className="block">
            <Card
              className="p-4 border-2 flex items-center gap-3 transition-all hover:scale-[1.01] animate-pulse-slow"
              style={{
                background: `linear-gradient(135deg, ${theme.icon}33, ${theme.bigBox})`,
                borderColor: theme.icon,
                boxShadow: `0 0 28px ${theme.icon}66`,
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2"
                style={{ background: `${theme.icon}40`, borderColor: theme.icon }}>
                <ShieldCheck className="w-6 h-6" style={{ color: theme.icon }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base leading-tight" style={{ color: theme.headColor }}>
                  {lt("Admin Panel", "అడ్మిన్ ప్యానెల్")}
                </div>
                <div className="text-xs leading-tight" style={{ color: theme.subColor }}>
                  {lt("Member ID Update · Society Approvals", "మెంబర్ ID అప్‌డేట్ · సొసైటీ ఆమోదాలు")}
                </div>
              </div>
              <span className="text-2xl shrink-0" style={{ color: theme.icon }}>→</span>
            </Card>
          </Link>
        )}

        {/* Active role indicator + Member View switch */}
        <div className="flex items-center justify-center gap-2 -mt-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border" style={{ borderColor: theme.border, background: theme.miniBox, color: theme.subColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.icon }} />
            {lt("Logged in as", "లాగిన్ అయిన వారు")}: <span className="font-semibold" style={{ color: theme.headColor }}>{lt(ROLE_LABELS[simRole].en, ROLE_LABELS[simRole].te)}</span>
          </span>
          {committeeQ.data?.isCommittee && !committeeQ.data?.isPrimaryAdmin && (
            <Link
              to="/member/dashboard"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 font-semibold shrink-0"
              title={lt("Switch to Member Dashboard", "సభ్యుడి డాష్‌బోర్డ్‌కి మారండి")}
            >
              <User className="h-3.5 w-3.5" />{lt("Member View", "సభ్యుడి వ్యూ")}
            </Link>
          )}
        </div>





        {/* Menu 2-col grid */}
        <div className="grid grid-cols-2 gap-3">
          {visibleMenu.map((m) => (
            <Link key={m.to} to={m.to}>
              <Card className="p-4 border transition-all cursor-pointer h-full"
                style={{ background: theme.miniBox, borderColor: theme.border }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${theme.icon}40`; e.currentTarget.style.borderColor = theme.icon; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ``; e.currentTarget.style.borderColor = theme.border; }}>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center border"
                    style={{ background: `${theme.icon}26`, borderColor: `${theme.icon}66` }}>
                    <m.icon className="w-5 h-5" style={{ color: theme.icon }} />
                  </div>
                  <span className="font-medium text-xs leading-tight" style={{ color: theme.headColor }}>{lt(m.en, m.te)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center pt-2" style={{ color: theme.smallColor, fontSize: theme.smallSize }}>Org Code: <span className="font-mono" style={{ color: theme.icon }}>{org.org_code}</span></p>
      </div>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{lt("Society QR Code", "సొసైటీ QR కోడ్")}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {lt("New members can scan this QR code to join.", "కొత్త సభ్యులు ఈ QR కోడ్‌ను స్కాన్ చేసి చేరగలరు.")}
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Org QR" className="w-64 h-64 border rounded-md bg-white" />
              <p className="text-sm font-mono text-[#ff8c28]">{org.org_code}</p>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-md border border-emerald-700 bg-emerald-950/50 p-2 text-center text-xs font-semibold text-emerald-200 break-all"
              >
                {registrationUrl}
              </a>
              <a href={qrDataUrl} download={`${org.org_code}-qr.png`}>
                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"><Download className="w-4 h-4 mr-1" />{lt("Download", "డౌన్‌లోడ్")}</Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">QR జనరేట్ అవుతోంది…</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#ff8c28]" /> {lt("Settings", "సెట్టింగ్స్")}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {lt("Manage your society's MBR registration.", "మీ సొసైటీ MBR నమోదును నిర్వహించండి.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {isSuperAdmin && (
              <Button
                onClick={() => { setSettingsOpen(false); navigate({ to: "/org/admin-access" }); }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 justify-start"
              >
                <KeyRound className="h-4 w-4 mr-2 text-[#ff8c28]" /> {lt("Admin Role & Access", "అడ్మిన్ పాత్రలు & అనుమతులు")}
              </Button>
            )}
            <Button
              onClick={() => { setSettingsOpen(false); navigate({ to: "/org/subscription" }); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 justify-start"
            >
              <Receipt className="h-4 w-4 mr-2 text-[#ff8c28]" /> {lt("Subscription & Receipts", "సబ్‌స్క్రిప్షన్ & రసీదులు")}
            </Button>
            <Button
              onClick={() => { setSettingsOpen(false); navigate({ to: "/org/theme" }); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-zinc-700 justify-start"
            >
              <Settings className="h-4 w-4 mr-2 text-[#ff8c28]" /> {lt("Design & Theme", "రంగులు & డిజైన్")}
            </Button>

            {/* Admin has no "Leave Organization" — members leave from their own dashboard.
                Suspending / removing another member is handled in the Disciplinary Committee page. */}
            <Button
              onClick={() => { setCancelStep(1); setResolutionUrl(""); setSettingsOpen(false); setCancelOpen(true); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold border-0 shadow-[0_0_24px_rgba(220,38,38,0.45)]"
            >
              <ShieldAlert className="h-4 w-4 mr-1" /> {lt("Cancel MBR Registration", "సభ్యత్వం రద్దు")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Organization Confirmation */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> {lt("Leave Organization?", "సంస్థ నుండి వైదొలగాలా?")}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {lt(
                "Are you sure you want to leave this organization? Your membership profile will be removed and you will be logged out. This action cannot be undone.",
                "మీరు ఈ సంస్థ నుండి వైదొలగాలనుకుంటున్నారా? మీ సభ్యత్వ ప్రొఫైల్ తొలగించబడుతుంది మరియు మీరు లాగ్ అవుట్ చేయబడతారు. ఈ చర్య తిరిగి మార్చబడదు."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLeaveOpen(false)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">{lt("Cancel", "రద్దు")}</Button>
            <Button disabled={leaving} onClick={leaveOrganization} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              {leaving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <LogOut className="h-4 w-4 mr-1" />}
              {lt("Confirm Leave", "వైదొలగడాన్ని నిర్ధారించండి")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation 3-step Dialog */}
      <Dialog open={cancelOpen} onOpenChange={(o) => { setCancelOpen(o); if (!o) setCancelStep(1); }}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {lt(`Cancel Registration — Step ${cancelStep} of 3`, `సభ్యత్వం రద్దు — 3లో ${cancelStep}వ స్టెప్`)}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {cancelStep === 1 && lt("Export your data before leaving.", "వెళ్లే ముందు మీ డేటాను డౌన్‌లోడ్ చేసుకోండి.")}
              {cancelStep === 2 && lt("Upload signed committee resolution.", "సంతకం చేసిన కమిటీ తీర్మానాన్ని అప్‌లోడ్ చేయండి.")}
              {cancelStep === 3 && lt("Final confirmation.", "చివరి నిర్ధారణ.")}
            </DialogDescription>
          </DialogHeader>

          {cancelStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                {lt(
                  "Download your entire society data (members, committee, rules, events) before cancelling.",
                  "రద్దు చేసే ముందు మీ పూర్తి సొసైటీ డేటాను (సభ్యులు, కమిటీ, నియమాలు, ఈవెంట్‌లు) డౌన్‌లోడ్ చేసుకోండి."
                )}
              </p>
              <Button onClick={exportData} disabled={exporting} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold shadow-[0_0_24px_rgba(255,140,40,0.45)]">
                {exporting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                {lt("Download Entire Society Data", "పూర్తి సొసైటీ డేటాను డౌన్‌లోడ్ చేసుకోండి")}
              </Button>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelOpen(false)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">{lt("Back", "వెనక్కి")}</Button>
                <Button onClick={() => setCancelStep(2)} className="bg-zinc-200 text-black hover:bg-white">{lt("Next", "తర్వాత")} →</Button>
              </DialogFooter>
            </div>
          )}

          {cancelStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                {lt(
                  "Upload Committee Resolution Copy (signed picture/PDF approving exit).",
                  "కమిటీ తీర్మానం పత్రం అప్‌లోడ్ చేయండి (వైదొలగడాన్ని ఆమోదించిన సంతకం చేసిన చిత్రం/PDF)."
                )}
              </p>
              <label className="block">
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadResolution} />
                <div className="cursor-pointer flex items-center justify-center gap-2 h-24 rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-[#ff8c28]/60 text-sm text-zinc-300">
                  {resolutionBusy ? <RefreshCw className="h-5 w-5 animate-spin" /> : resolutionUrl ? <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> {lt("Uploaded — tap to replace", "అప్‌లోడ్ అయింది — మార్చడానికి నొక్కండి")}</> : <><Upload className="h-5 w-5" /> {lt("Tap to upload resolution", "తీర్మానం పత్రం అప్‌లోడ్ చేయడానికి నొక్కండి")}</>}
                </div>
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelStep(1)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">← {lt("Back", "వెనక్కి")}</Button>
                <Button disabled={!resolutionUrl} onClick={() => setCancelStep(3)} className="bg-zinc-200 text-black hover:bg-white disabled:opacity-50">{lt("Next", "తర్వాత")} →</Button>
              </DialogFooter>
            </div>
          )}

          {cancelStep === 3 && (
            <div className="space-y-3">
              <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
                <strong>{lt("⚠ Final Warning:", "⚠ చివరి హెచ్చరిక:")}</strong> {lt("Your data will enter a 30-day Read-Only Grace Period before permanent erasure. You can reactivate anytime within 30 days by contacting MBR support.", "శాశ్వతంగా తొలగించే ముందు మీ డేటా 30 రోజుల Read-Only గ్రేస్ పీరియడ్‌లో ఉంటుంది. 30 రోజుల్లో ఎప్పుడైనా MBR సపోర్ట్‌ను సంప్రదించి మళ్లీ యాక్టివేట్ చేసుకోవచ్చు.")}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelStep(2)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">← {lt("Back", "వెనక్కి")}</Button>
                <Button disabled={confirming} onClick={confirmCancellation} className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-[0_0_24px_rgba(220,38,38,0.45)]">
                  {confirming ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
                  {lt("Confirm Cancellation", "రద్దును నిర్ధారించండి")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
