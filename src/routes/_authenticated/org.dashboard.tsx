import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getMyOrg, updateOrgLogo, updateOrgPresident } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut, BookOpen, Users, Briefcase, Calendar, IdCard, Wallet,
  MessageSquare, QrCode, Camera, Download, RefreshCw,
} from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Society Dashboard — MBR App" }] }),
  component: Dashboard,
});

const MENU = [
  { to: "/org/rules", label: "సొసైటీ రూల్స్ & హిస్టరీ", icon: BookOpen },
  { to: "/org/members", label: "సభ్యుల వివరాలు & నమోదు", icon: Users },
  { to: "/org/committee", label: "కార్యవర్గ కమిటీ వివరాలు", icon: Briefcase },
  { to: "/org/events", label: "కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు", icon: Calendar },
  { to: "/org/designs", label: "ID కార్డులు, మెమెంటోలు, లెటర్‌ప్యాడ్, స్టాంప్ డిజైన్", icon: IdCard },
  { to: "/org/accounts", label: "అకౌంట్స్", icon: Wallet },
  { to: "/org/chat", label: "సభ్యులతో చాటింగ్", icon: MessageSquare },
] as const;

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const saveLogo = useServerFn(updateOrgLogo);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const [qrOpen, setQrOpen] = useState(false);
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

  if (orgQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-tricolor">Loading…</div>;

  const org = orgQ.data?.org;
  const qrDataUrl = orgQ.data?.qrDataUrl;
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="p-6 text-center space-y-3 bg-white/90 backdrop-blur-xl">
          <p>మీకు Organization లేదు.</p>
          <Button onClick={() => navigate({ to: "/org/register" })}>Register Org</Button>
        </Card>
      </div>
    );
  }

  if (org.approval_status !== "approved") {
    const pending = org.approval_status === "pending";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="w-full max-w-md p-6 text-center space-y-4 bg-white/92 backdrop-blur-xl shadow-2xl border-white">
          <img src={mbrLogo.url} alt="MBR" className="w-16 h-16 mx-auto rounded-md bg-black p-1.5" />
          <h2 className="text-xl font-bold">{pending ? "MBR సమీక్షలో ఉంది" : "Application Rejected"}</h2>
          {pending ? (
            <>
              <p className="text-sm text-muted-foreground">
                మీ Society registration MBR admin సమీక్షిస్తున్నారు. Logo, Government Registration, Founders ID ధృవీకరణ తర్వాత Email ద్వారా approval వస్తుంది. తరువాత మళ్లీ login చేయండి.
              </p>
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-900">
                Status: <span className="font-bold">PENDING REVIEW</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive">
                మీ application reject అయింది.
              </p>
              {org.approval_notes && (
                <div className="text-xs bg-red-50 border border-red-200 rounded-md p-3 text-red-900 text-left">
                  <strong>కారణం:</strong> {org.approval_notes}
                </div>
              )}
            </>
          )}
          <Button onClick={logout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />Logout
          </Button>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoPicked} />
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top bar: membership QR (left) + Logout + MBR brand (right) */}
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="w-14 h-14 rounded-md bg-white/90 backdrop-blur shadow border border-white flex items-center justify-center overflow-hidden hover:scale-105 transition"
            aria-label="సొసైటీ QR కోడ్ చూడండి"
            title="సొసైటీ QR కోడ్ చూడండి"
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Society QR" className="w-full h-full object-contain p-1" />
            ) : (
              <QrCode className="w-7 h-7 text-muted-foreground" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={logout} className="text-foreground">
              <LogOut className="h-4 w-4 mr-1" />Logout
            </Button>
            <img src={mbrLogo.url} alt="MBR" className="w-12 h-12 rounded-md bg-black shadow border border-black object-contain p-1 select-none pointer-events-none" draggable={false} />
          </div>
        </div>

        {/* Society headline card */}
        <Card className="p-4 bg-white/95 backdrop-blur-xl shadow-xl border-white">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-20 h-20 shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden group border border-border shadow-sm"
              aria-label="సొసైటీ లోగో మార్చండి"
              title="సొసైటీ లోగో మార్చండి / అప్‌లోడ్ చేయండి"
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt={`${org.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {org.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 bg-black/45 text-white text-[10px] font-medium flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5 mb-0.5" />మార్చండి</>}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <h1
                className="font-extrabold leading-tight whitespace-nowrap overflow-hidden tracking-tight"
                style={{
                  fontSize: "clamp(0.85rem, 4.6vw, 1.6rem)",
                  background: "linear-gradient(90deg,#B85C00 0%,#0B5C06 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {org.name}
              </h1>
              {org.slogan && (
                <p className="mt-1 text-sm text-muted-foreground italic">{org.slogan}</p>
              )}
              {org.gov_reg_number && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Reg No: <span className="font-mono text-foreground">{org.gov_reg_number}</span>
                </p>
              )}
            </div>
          </div>
          <PresidentSignature org={org} onSaved={() => qc.invalidateQueries({ queryKey: ["my-org"] })} />
        </Card>

        {/* Menu grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to}>
              <Card className="p-4 bg-white/92 backdrop-blur hover:bg-white hover:shadow-lg transition-all border-white cursor-pointer h-full">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#FF9933,#138808)" }}>
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-sm leading-tight">{m.label}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">Org Code: <span className="font-mono">{org.org_code}</span></p>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>సొసైటీ QR కోడ్</DialogTitle>
            <DialogDescription>
              కొత్త సభ్యులు ఈ QR కోడ్‌ను స్కాన్ చేసి సొసైటీలో చేరగలరు.
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Org QR" className="w-64 h-64 border rounded-md bg-white" />
              <p className="text-sm font-mono">{org.org_code}</p>
              <a href={qrDataUrl} download={`${org.org_code}-qr.png`}>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Download</Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">QR జనరేట్ అవుతోంది…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresidentSignature({ org, onSaved }: { org: any; onSaved: () => void }) {
  const save = useServerFn(updateOrgPresident);
  const [name, setName] = useState<string>(org.president_name ?? "");
  const [sigUrl, setSigUrl] = useState<string | null>(org.president_signature_url ?? null);
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("ఫైల్ 2MB మించరాదు"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/president-sig/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("URL generation failed");
      await save({ data: { president_signature_url: url } });
      setSigUrl(url);
      onSaved();
      toast.success("సంతకం అప్‌లోడ్ అయింది");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function saveName() {
    if (name === (org.president_name ?? "")) return;
    setBusy(true);
    try {
      await save({ data: { president_name: name || null } });
      toast.success("ప్రెసిడెంట్ పేరు సేవ్ అయింది");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 pt-3 border-t flex flex-wrap items-end gap-3">
      <input ref={inp} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPick} />
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs text-muted-foreground">ప్రెసిడెంట్ పేరు (ID కార్డ్‌లో చూపబడుతుంది)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          placeholder="ఉదా: M. భాస్కర్ రెడ్డి"
          className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border bg-white"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="h-12 w-28 rounded-md border bg-white flex items-center justify-center overflow-hidden">
          {sigUrl ? (
            <img src={sigUrl} alt="signature" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">సంతకం</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => inp.current?.click()} disabled={busy}>
          <Camera className="w-4 h-4 mr-1" /> {sigUrl ? "మార్చండి" : "అప్‌లోడ్"}
        </Button>
      </div>
    </div>
  );
}
