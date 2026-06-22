import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getMyOrg, updateOrgLogo } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut, BookOpen, Users, Briefcase, Calendar, IdCard, Wallet,
  MessageSquare, QrCode, Camera, Download, RefreshCw, Settings, AlertTriangle,
  Upload, ShieldAlert, FileDown, CheckCircle2, Vote,
} from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { localizeText, transliterateText, useI18n } from "@/lib/i18n";
import { resolveTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Society Dashboard — MBR App" }] }),
  component: Dashboard,
});

const MENU = [
  { to: "/org/rules", en: "Society Rules & History", te: "సొసైటీ రూల్స్ & హిస్టరీ", icon: BookOpen },
  { to: "/org/members", en: "Members & Registration", te: "సభ్యుల వివరాలు & నమోదు", icon: Users },
  { to: "/org/committee", en: "Executive Committee", te: "కార్యవర్గ కమిటీ వివరాలు", icon: Briefcase },
  { to: "/org/events", en: "Events, Meetings, Decisions", te: "కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు", icon: Calendar },
  { to: "/org/designs", en: "ID Cards, Mementos, Letterhead, Stamp Design", te: "ID కార్డులు, మెమెంటోలు, లెటర్‌ప్యాడ్, స్టాంప్ డిజైన్", icon: IdCard },
  { to: "/org/theme", en: "Design & Theme", te: "రంగులు మరియు డిజైన్", icon: Settings },

  { to: "/org/accounts", en: "Accounts", te: "అకౌంట్స్", icon: Wallet },
  { to: "/org/chat", en: "Member Chat", te: "సభ్యులతో చాటింగ్", icon: MessageSquare },
  { to: "/org/elections", en: "Board Elections", te: "బోర్డు ఎన్నికలు", icon: Vote },
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
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2 | 3>(1);
  const [resolutionUrl, setResolutionUrl] = useState<string>("");
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      toast.success("Data downloaded / డేటా డౌన్‌లోడ్ అయింది");
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
      toast.success("Resolution uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
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
      toast.success("Cancellation request recorded. 30-day grace period started.");
      setCancelOpen(false);
      setSettingsOpen(false);
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setConfirming(false);
    }
  }

  if (orgQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading…</div>;

  const org = orgQ.data?.org;
  const qrDataUrl = orgQ.data?.qrDataUrl;
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <Card className="p-6 text-center space-y-3 bg-zinc-950 border-zinc-800 text-white">
          <p>మీకు Organization లేదు.</p>
          <Button onClick={() => navigate({ to: "/org/register" })} className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">Register Org</Button>
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
          <h2 className="text-xl font-bold">{pending ? "MBR సమీక్షలో ఉంది" : "Application Rejected"}</h2>
          {pending ? (
            <>
              <p className="text-sm text-zinc-400">
                మీ Society registration MBR admin సమీక్షిస్తున్నారు. Logo, Government Registration, Founders ID ధృవీకరణ తర్వాత Email ద్వారా approval వస్తుంది.
              </p>
              <div className="text-xs bg-[#ff8c28]/10 border border-[#ff8c28]/40 rounded-md p-3 text-[#ffb072]">
                Status: <span className="font-bold">PENDING REVIEW</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-red-400">మీ application reject అయింది.</p>
              {org.approval_notes && (
                <div className="text-xs bg-red-950 border border-red-900 rounded-md p-3 text-red-200 text-left">
                  <strong>కారణం:</strong> {org.approval_notes}
                </div>
              )}
            </>
          )}
          <Button onClick={logout} variant="outline" className="w-full border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
            <LogOut className="h-4 w-4 mr-2" />Logout
          </Button>
        </Card>
      </div>
    );
  }

  const theme = resolveTheme(org);
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
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="w-14 h-14 rounded-md bg-zinc-950 border border-zinc-800 shadow-[0_0_20px_rgba(255,140,40,0.2)] flex items-center justify-center overflow-hidden hover:scale-105 transition"
            aria-label="సొసైటీ QR కోడ్"
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Society QR" className="w-full h-full object-contain p-1 bg-white" />
            ) : (
              <QrCode className="w-7 h-7 text-zinc-500" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/theme" })} className="text-zinc-200 hover:bg-zinc-900 hover:text-white" aria-label="Theme & Design">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-zinc-200 hover:bg-zinc-900 hover:text-white">
              <LogOut className="h-4 w-4 mr-1" />{lt("Logout", "లాగ్ అవుట్")}
            </Button>
            <img src={mbrLogo.url} alt="MBR" className="w-12 h-12 rounded-md bg-black border border-zinc-800 object-contain p-1" />
          </div>
        </div>

        {/* Society headline card */}
        <Card className="p-4 border" style={{ background: theme.box, borderColor: theme.border, boxShadow: `0 0 40px ${theme.icon}1a` }}>
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
                  {org.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 bg-black/60 text-white text-[10px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5 mb-0.5" />మార్చండి</>}
              </span>
            </button>
            <div className="min-w-0 flex-1" style={{ textAlign: theme.headAlign }}>
              <h1 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: "clamp(0.95rem, 4.6vw, 1.6rem)", color: theme.headColor, fontFamily: `${theme.headFont}, system-ui, sans-serif` }}>
                {transliterateText(org.name, lang)}
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

        {/* Accounts Summary — unified card */}
        <Card className="p-4 border" style={{ background: theme.box, borderColor: theme.border, boxShadow: `0 0 30px ${theme.icon}1a` }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: theme.headColor }}>{lt("Accounts Summary", "అకౌంట్స్ వివరాలు")}</h2>
          </div>
          <div className="flex items-stretch divide-x" style={{ borderColor: theme.border }}>
            <MetricItem label={lt("Total Funds", "మొత్తం నిధులు")} sub="" value="₹ 0" />
            <MetricItem label={lt("Loans Disbursed", "మార్కెట్ అప్పులు")} sub="" value="₹ 0" />
            <MetricItem label={lt("Interest Collected", "వచ్చిన వడ్డీ")} sub="" value="₹ 0" />
          </div>
        </Card>

        {/* Menu 2-col grid */}
        <div className="grid grid-cols-2 gap-3">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to}>
              <Card className="p-4 border transition-all cursor-pointer h-full"
                style={{ background: theme.box, borderColor: theme.border }}
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
            <DialogTitle className="text-white">సొసైటీ QR కోడ్</DialogTitle>
            <DialogDescription className="text-zinc-400">
              కొత్త సభ్యులు ఈ QR కోడ్‌ను స్కాన్ చేసి చేరగలరు.
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Org QR" className="w-64 h-64 border rounded-md bg-white" />
              <p className="text-sm font-mono text-[#ff8c28]">{org.org_code}</p>
              <a href={qrDataUrl} download={`${org.org_code}-qr.png`}>
                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"><Download className="w-4 h-4 mr-1" />Download</Button>
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
              <Settings className="h-5 w-5 text-[#ff8c28]" /> Settings / సెట్టింగ్స్
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Manage your society's MBR registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => { setCancelStep(1); setResolutionUrl(""); setSettingsOpen(false); setCancelOpen(true); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold border-0 shadow-[0_0_24px_rgba(220,38,38,0.45)]"
            >
              <ShieldAlert className="h-4 w-4 mr-1" /> Cancel MBR Registration / సభ్యత్వం రద్దు
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation 3-step Dialog */}
      <Dialog open={cancelOpen} onOpenChange={(o) => { setCancelOpen(o); if (!o) setCancelStep(1); }}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancel Registration — Step {cancelStep} of 3
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {cancelStep === 1 && "Export your data before leaving."}
              {cancelStep === 2 && "Upload signed committee resolution."}
              {cancelStep === 3 && "Final confirmation."}
            </DialogDescription>
          </DialogHeader>

          {cancelStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Download your entire society data (members, committee, rules, events) before cancelling.
              </p>
              <Button onClick={exportData} disabled={exporting} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold shadow-[0_0_24px_rgba(255,140,40,0.45)]">
                {exporting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Download Entire Society Data / డేటాను డౌన్‌లోడ్ చేసుకోండి
              </Button>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelOpen(false)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">Back</Button>
                <Button onClick={() => setCancelStep(2)} className="bg-zinc-200 text-black hover:bg-white">Next →</Button>
              </DialogFooter>
            </div>
          )}

          {cancelStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Upload Committee Resolution Copy / కమిటీ తీర్మానం పత్రం (signed picture/PDF approving exit).
              </p>
              <label className="block">
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadResolution} />
                <div className="cursor-pointer flex items-center justify-center gap-2 h-24 rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-[#ff8c28]/60 text-sm text-zinc-300">
                  {resolutionBusy ? <RefreshCw className="h-5 w-5 animate-spin" /> : resolutionUrl ? <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Uploaded — tap to replace</> : <><Upload className="h-5 w-5" /> Tap to upload resolution</>}
                </div>
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelStep(1)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">← Back</Button>
                <Button disabled={!resolutionUrl} onClick={() => setCancelStep(3)} className="bg-zinc-200 text-black hover:bg-white disabled:opacity-50">Next →</Button>
              </DialogFooter>
            </div>
          )}

          {cancelStep === 3 && (
            <div className="space-y-3">
              <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
                <strong>⚠ Final Warning:</strong> Your data will enter a <strong>30-day Read-Only Grace Period</strong> before permanent erasure. You can reactivate anytime within 30 days by contacting MBR support.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelStep(2)} className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">← Back</Button>
                <Button disabled={confirming} onClick={confirmCancellation} className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-[0_0_24px_rgba(220,38,38,0.45)]">
                  {confirming ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
                  Confirm Cancellation
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
