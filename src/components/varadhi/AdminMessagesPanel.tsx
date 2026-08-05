import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListVaradhiMessages, adminReplyVaradhiMessage } from "@/lib/varadhi.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function AdminMessagesPanel() {
  const list = useServerFn(adminListVaradhiMessages);
  const reply = useServerFn(adminReplyVaradhiMessage);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reload = async () => {
    setLoading(true);
    try {
      const r = await list({ data: {} });
      setRows(r.messages ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async (id: string, status?: string) => {
    try {
      await reply({ data: { id, reply: drafts[id] ?? undefined, status } });
      toast.success("సేవ్ అయ్యింది");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "విఫలమైంది");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">లోడ్ అవుతోంది…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">ఇంకా సందేశాలు లేవు.</p>;

  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <Card key={m.id} className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1e3a8a]">{m.sender_name ?? "వినియోగదారు"}</p>
              <p className="text-[10px] text-muted-foreground">
                {[m.mandal, m.district, m.state].filter(Boolean).join(", ") || "—"}
                {m.phone ? ` · ${m.phone}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[10px] font-semibold">
              {m.status}
            </span>
          </div>
          <p className="text-xs text-[#1e3a8a]">{m.message}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("te-IN")}</p>
          <Textarea
            rows={2}
            value={drafts[m.id] ?? m.admin_reply ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
            placeholder="జవాబు రాయండి…"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(m.id, "read")}>జవాబు సేవ్</Button>
            <Button size="sm" variant="outline" onClick={() => save(m.id, "resolved")}>పరిష్కరించారు</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
