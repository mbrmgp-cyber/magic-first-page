import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitVaradhiAdminRequest, myVaradhiAdminRequests } from "@/lib/varadhi.functions";
import { INDIA_STATES, indiaDistrictsFor } from "@/lib/india-locations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, Send, Upload, Check } from "lucide-react";

export const Route = createFileRoute("/varadhi/admin-apply")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vaaradhi Admin Application — Apply as State or District Admin" },
      { name: "description", content: "Apply to become a Vaaradhi State Admin or District Admin for your area in Andhra Pradesh and Telangana." },
      { property: "og:title", content: "Vaaradhi Admin Application" },
      { property: "og:description", content: "Apply to become a Vaaradhi State or District Admin for your area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminApply,
});

function AdminApply() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useServerFn(submitVaradhiAdminRequest);
  const mine = useServerFn(myVaradhiAdminRequests);

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      setAuthed(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<"state_admin" | "district_admin">("state_admin");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [aadhaarUrl, setAadhaarUrl] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const listQ = useQuery({ queryKey: ["varadhi-my-admin-requests"], queryFn: () => mine(), enabled: authed === true });

  async function uploadTo(file: File, field: "photo" | "aadhaar") {
    setUploading(field);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("లాగిన్ అవ్వండి");
      const path = `${uid}/admin-${field}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("varadhi-proofs").upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      if (field === "photo") setPhotoUrl(path); else setAadhaarUrl(path);
      toast.success("అప్‌లోడ్ అయింది");
    } catch (e: any) {
      toast.error(e.message ?? "అప్‌లోడ్ విఫలమైంది");
    } finally {
      setUploading(null);
    }
  }

  async function send() {
    setBusy(true);
    try {
      await submit({ data: { full_name: fullName, phone, requested_level: level, state, district, message, photo_url: photoUrl, aadhaar_url: aadhaarUrl } });
      toast.success("దరఖాస్తు పంపబడింది");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["varadhi-my-admin-requests"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setBusy(false);
    }
  }

  const valid =
    fullName.trim().length >= 2 && !!state &&
    (level === "state_admin" || !!district) &&
    !!photoUrl && !!aadhaarUrl;
  if (authed === null) return <p className="p-8 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-[#1e3a8a]">అడ్మిన్ దరఖాస్తు</h1>
        <Link to="/varadhi" className="text-xs underline text-[#1e3a8a]/70">హోమ్</Link>
      </header>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-[#1e3a8a]">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-xs">మీ ప్రాంతానికి వారధి అడ్మిన్‌గా పని చేయడానికి దరఖాస్తు చేసుకోండి. సూపర్ అడ్మిన్ ఆమోదిస్తారు.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">పూర్తి పేరు *</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="పేరు" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">ఫోన్ / వాట్సాప్</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="9xxxxxxxxx" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">ఏ స్థాయి?</label>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" size="sm" variant={level === "state_admin" ? "default" : "outline"} onClick={() => setLevel("state_admin")}>
              రాష్ట్ర
            </Button>
            <Button type="button" size="sm" variant={level === "district_admin" ? "default" : "outline"} onClick={() => setLevel("district_admin")}>
              జిల్లా
            </Button>
            <Button type="button" size="sm" variant={level === "mandal_admin" ? "default" : "outline"} onClick={() => setLevel("mandal_admin")}>
              మండల
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">రాష్ట్రం / కేంద్రపాలిత ప్రాంతం *</label>
          <select
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={state}
            onChange={(e) => { setState(e.target.value); setDistrict(""); setMandal(""); }}
          >
            <option value="">ఎంచుకోండి</option>
            {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">జిల్లా {level !== "state_admin" ? "*" : ""}</label>
          <select
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setMandal(""); }}
            disabled={!state}
            size={1}
          >
            <option value="">{state ? "ఎంచుకోండి" : "ముందు రాష్ట్రం ఎంచుకోండి"}</option>
            {indiaDistrictsFor(state).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {level === "mandal_admin" && (
          <div className="space-y-1">
            <label className="text-xs font-medium">మండలం *</label>
            <Input
              value={mandal}
              onChange={(e) => setMandal(e.target.value)}
              disabled={!district}
              placeholder={district ? "మండలం పేరు టైప్ చేయండి" : "ముందు జిల్లా ఎంచుకోండి"}
            />
            <p className="text-[10px] text-muted-foreground">మండల అడ్మిన్ — జిల్లా అడ్మిన్ ఆధీనంలో పని చేస్తారు.</p>
          </div>
        )}


        <UploadField
          label="ప్రొఫైల్ ఫోటో *"
          done={!!photoUrl}
          busy={uploading === "photo"}
          accept="image/*"
          onFile={(f) => uploadTo(f, "photo")}
        />
        <UploadField
          label="ఆధార్ కార్డు (ఫోటో / PDF) *"
          done={!!aadhaarUrl}
          busy={uploading === "aadhaar"}
          accept="image/*,application/pdf"
          onFile={(f) => uploadTo(f, "aadhaar")}
        />

        <div className="space-y-1">
          <label className="text-xs font-medium">మీ గురించి / అనుభవం</label>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
        </div>


        <Button className="w-full" disabled={!valid || busy} onClick={send}>
          <Send className="h-4 w-4 mr-1" /> {busy ? "పంపుతోంది…" : "దరఖాస్తు పంపండి"}
        </Button>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[#1e3a8a]/80">నా దరఖాస్తులు</h2>
        {(listQ.data?.requests ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">ఇంకా దరఖాస్తులు లేవు.</p>
        ) : (
          (listQ.data?.requests ?? []).map((r: any) => (
            <Card key={r.id} className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {r.requested_level === "state_admin" ? "రాష్ట్ర అడ్మిన్" : "జిల్లా అడ్మిన్"} · {r.state}{r.district ? ` / ${r.district}` : ""}
                </span>
                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                  {r.status === "approved" ? "ఆమోదం" : r.status === "rejected" ? "తిరస్కరణ" : "పెండింగ్"}
                </Badge>
              </div>
              {r.review_notes && <p className="text-muted-foreground">గమనిక: {r.review_notes}</p>}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function UploadField({
  label, done, busy, accept, onFile,
}: {
  label: string; done: boolean; busy: boolean; accept: string; onFile: (f: File) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <label className={`flex cursor-pointer items-center justify-between rounded-md border border-dashed px-3 py-3 text-xs ${done ? "border-green-500/60 bg-green-50" : "border-input bg-background"}`}>
        <span className="truncate">
          {busy ? "అప్‌లోడ్ అవుతోంది…" : done ? "అప్‌లోడ్ అయింది" : "ఫైల్ ఎంచుకోండి"}
        </span>
        {done ? <Check className="h-4 w-4 text-green-600" /> : <Upload className="h-4 w-4" />}
        <input
          type="file"
          accept={accept}
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </label>
    </div>
  );
}

