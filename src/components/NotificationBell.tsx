import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n, localizeText } from "@/lib/i18n";

type Notif = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; kind: string };

export function NotificationBell() {
  const { lang } = useI18n() as any;
  const L = (en: string, te: string, hi: string) => localizeText({ en, te, hi } as any, lang);
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const load = async (id: string) => {
    const { data } = await supabase.from("notifications").select("id,title,body,link,read_at,created_at,kind")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(30);
    setItems((data as Notif[]) ?? []);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id;
      if (!id) return;
      setUid(id);
      load(id);
      channel = supabase.channel(`notif-${id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${id}` }, () => load(id))
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  const markAll = async () => {
    if (!uid) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
    load(uid);
  };

  const open = async (n: Notif) => {
    if (!n.read_at) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    if (uid) load(uid);
    if (n.link) navigate({ to: n.link as any });
  };

  const titleText = (t: string) => {
    const map: Record<string, [string, string]> = {
      "New member registration": ["కొత్త సభ్యుని రిజిస్ట్రేషన్", "नया सदस्य पंजीकरण"],
      "Member photo updated": ["సభ్యుని ఫోటో అప్‌లోడ్", "सदस्य फोटो अपडेट"],
      "Membership approved": ["మీ సభ్యత్వం ఆమోదించబడింది", "आपकी सदस्यता स्वीकृत"],
      "Membership rejected": ["మీ సభ్యత్వం తిరస్కరించబడింది", "आपकी सदस्यता अस्वीकृत"],
      "New loan request": ["కొత్త లోన్ అభ్యర్థన", "नया ऋण अनुरोध"],
      "New leave request": ["కొత్త నిష్క్రమణ అభ్యర్థన", "नया छुट्टी/त्याग अनुरोध"],
    };
    const m = map[t];
    return m ? L(t, m[0], m[1]) : t;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label={L("Notifications", "నోటిఫికేషన్లు", "सूचनाएं")} data-notranslit
          className="relative inline-flex items-center justify-center rounded-md border border-zinc-700 bg-black/40 h-9 w-9 text-white/90 hover:bg-white/10 shrink-0">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-notranslit>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">{L("Notifications", "నోటిఫికేషన్లు", "सूचनाएं")}</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              {L("Mark all read", "అన్నీ చదివినట్లు", "सभी पढ़ा")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{L("No notifications yet", "ఇంకా నోటిఫికేషన్లు లేవు", "अभी कोई सूचना नहीं")}</p>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => open(n)}
              className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted ${n.read_at ? "" : "bg-primary/5"}`}>
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 h-2 w-2 rounded-full bg-red-600 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{titleText(n.title)}</p>
                  {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
