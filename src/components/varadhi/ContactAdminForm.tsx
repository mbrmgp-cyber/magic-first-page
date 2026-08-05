import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendVaradhiAdminMessage, listMyVaradhiAdminMessages } from "@/lib/varadhi.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

export function ContactAdminForm() {
  const send = useServerFn(sendVaradhiAdminMessage);
  const listMine = useServerFn(listMyVaradhiAdminMessages);
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<any[]>([]);

  const reload = () => listMine().then((r) => setMine(r.messages ?? [])).catch(() => undefined);
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const submit = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      await send({ data: { message: msg.trim(), phone: phone.trim() } });
      setMsg("");
      toast.success("మీ సందేశం అడ్మిన్‌కు పంపబడింది");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "పంపడం విఫలమైంది");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-[#1e3a8a]">అడ్మిన్‌కు సందేశం పంపండి</h2>
        </div>
        <Textarea
          rows={4}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="మీ సమస్య / సూచన ఇక్కడ రాయండి…"
        />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ఫోన్ నంబర్ (ఐచ్ఛికం)" />
        <Button onClick={submit} disabled={busy || !msg.trim()} className="w-full">
          {busy ? "పంపుతోంది…" : "పంపండి"}
        </Button>
      </Card>

      {mine.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-[#1e3a8a]/80">నా సందేశాలు</h3>
          {mine.map((m) => (
            <div key={m.id} className="rounded-xl border border-black/5 bg-white p-2.5 text-xs">
              <p className="text-[#1e3a8a]">{m.message}</p>
              <p className="mt-1 text-[10px] text-[#1e3a8a]/50">
                {new Date(m.created_at).toLocaleString("te-IN")} · {m.status}
              </p>
              {m.admin_reply && (
                <p className="mt-1 rounded-lg bg-green-50 p-2 text-[11px] text-green-800">
                  అడ్మిన్ జవాబు: {m.admin_reply}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
