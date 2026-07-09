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

  useEffect(() => {
    if (typeof window === "undefined") return;

    type PrintWindow = Window & {
      __mbrCleanPrintInstalled?: boolean;
      __mbrNativePrint?: () => void;
    };

    const win = window as PrintWindow;
    let restoreTimer: number | undefined;

    const suppressAdBarForPrint = () => {
      document.documentElement.classList.add("mbr-printing");
      document.body.classList.add("mbr-printing");
      document.querySelectorAll<HTMLElement>(".mbr-global-ad-bar").forEach((el) => {
        if (!el.dataset.mbrPrintStyle) el.dataset.mbrPrintStyle = el.style.cssText || " ";
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("opacity", "0", "important");
        el.style.setProperty("width", "0", "important");
        el.style.setProperty("height", "0", "important");
        el.style.setProperty("overflow", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });
      // Force a layout flush before Android/Chromium snapshots the print page.
      void document.documentElement.offsetHeight;
    };

    const restoreAdBarAfterPrint = () => {
      if (document.getElementById("mbr-print-root")) return;
      document.documentElement.classList.remove("mbr-printing");
      document.body.classList.remove("mbr-printing");
      document.querySelectorAll<HTMLElement>(".mbr-global-ad-bar").forEach((el) => {
        const previous = el.dataset.mbrPrintStyle;
        if (previous !== undefined) {
          el.style.cssText = previous.trim() ? previous : "";
          delete el.dataset.mbrPrintStyle;
        }
      });
    };

    const scheduleRestore = (delay = 10_000) => {
      if (restoreTimer) window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(restoreAdBarAfterPrint, delay);
    };

    const onBeforePrint = () => suppressAdBarForPrint();
    const onAfterPrint = () => scheduleRestore(3_000);

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    if (!win.__mbrCleanPrintInstalled) {
      win.__mbrCleanPrintInstalled = true;
      win.__mbrNativePrint = window.print.bind(window);
      window.print = () => {
        suppressAdBarForPrint();
        window.setTimeout(() => {
          try {
            (win.__mbrNativePrint || window.print.bind(window))();
          } finally {
            scheduleRestore(15_000);
          }
        }, 150);
      };
    }

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      if (restoreTimer) window.clearTimeout(restoreTimer);
      if (win.__mbrCleanPrintInstalled && win.__mbrNativePrint) {
        window.print = win.__mbrNativePrint;
        delete win.__mbrNativePrint;
        delete win.__mbrCleanPrintInstalled;
      }
      restoreAdBarAfterPrint();
    };
  }, []);

  if (!signed.length) return null;
  const current = signed[idx % signed.length];

  return (
    <div
      className="mbr-global-ad-bar no-print print:hidden fixed left-0 right-0 bottom-0 z-40 pointer-events-none w-screen m-0 p-0 overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden="true"
    >
      <div className="w-screen max-w-none pointer-events-auto m-0 p-0">
        <div className="relative overflow-hidden bg-black shadow-[0_-6px_24px_rgba(0,0,0,0.55)] w-screen max-w-none h-[70px] m-0 p-0">
          <img
            src={current}
            alt="MBR platform advertisement"
            className="w-full h-[70px] object-cover block"
          />
        </div>
      </div>
    </div>
  );
}
