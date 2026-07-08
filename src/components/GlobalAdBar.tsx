import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function GlobalAdBar() {
  const q = useQuery({
    queryKey: ["mbr-global-ads-active"],
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mbr_global_ads" as any)
        .select("id,url,label")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) return [] as { id: string; url: string; label: string | null }[];
      return ((data as unknown) || []) as { id: string; url: string; label: string | null }[];
    },
  });

  const [signed, setSigned] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const rows = q.data || [];
    (async () => {
      const urls = await Promise.all(rows.map(async (r) => {
        if (/^https?:\/\//i.test(r.url) || r.url.startsWith("data:")) return r.url;
        const { data } = await supabase.storage.from("mbr-global-ads").createSignedUrl(r.url, 3600);
        return data?.signedUrl || "";
      }));
      if (!cancelled) setSigned(urls.filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify((q.data || []).map((r) => r.url))]);

  useEffect(() => {
    if (signed.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % signed.length), 6000);
    return () => clearInterval(t);
  }, [signed.length]);

  if (!signed.length) return null;
  const current = signed[idx % signed.length];

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 pointer-events-none w-screen m-0 p-0 overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-screen max-w-none pointer-events-auto m-0 p-0">
        <div className="relative overflow-hidden bg-black shadow-[0_-6px_24px_rgba(0,0,0,0.55)] w-screen max-w-none h-[70px] m-0 p-0">
          <img
            src={current}
            alt="MBR platform advertisement"
            className="block w-full h-full max-w-none m-0 p-0"
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
