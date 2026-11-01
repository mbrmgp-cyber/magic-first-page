import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrgs } from "@/lib/org.functions";
import { getActiveOrgId, onActiveOrgChange } from "@/lib/active-org";
import { adVisibleInOrganization, adMediaKind, managedAds, PROMOTION_URL, resolveAdUrl, type GlobalAd } from "@/lib/mbr-ads";
import { supabase } from "@/integrations/supabase/client";
import promotionVideo from "@/assets/videos/vaaradhi-promotion-logo-v2.mp4.asset.json";
import promotionWebm from "@/assets/videos/vaaradhi-promotion-logo-v2.webm.asset.json";
import { VARADHI_APP_URL } from "@/lib/app-hosts";

type AdSlide = { id: string; src: string; label: string | null; kind: "video" | "image"; href?: string; builtin: boolean };

export function GlobalAdBar() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const fetchOrgs = useServerFn(listMyOrgs);
  const orgsQ = useQuery({ queryKey: ["my-orgs"], queryFn: () => fetchOrgs(), staleTime: 60_000 });
  useEffect(() => { setSelectedOrg(getActiveOrgId()); return onActiveOrgChange(setSelectedOrg); }, []);
  const organizations = orgsQ.data?.orgs ?? [];
  const orgId = organizations.find((org) => org.id === selectedOrg)?.id ?? organizations[0]?.id ?? null;
  const q = useQuery({
    queryKey: ["mbr-global-ads-active"],
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mbr_global_ads" as any)
        .select("id,url,label,active,sort_order,organization_ids")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data as unknown) || []) as GlobalAd[];
    },
  });

  const [slides, setSlides] = useState<AdSlide[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSlides([]);
    if (!q.data) return;
    const rows = managedAds(q.data).filter((row) => adVisibleInOrganization(row, orgId));
    (async () => {
      const built = await Promise.all(rows.map(async (r) => {
        const src = await resolveAdUrl(r.url, async (path) => {
          const { data } = await supabase.storage.from("mbr-global-ads").createSignedUrl(path, 3600);
          return data?.signedUrl || "";
        });
        const builtin = r.url === PROMOTION_URL;
        return src ? { id: r.id, src, label: builtin ? null : r.label, kind: adMediaKind(r.url), builtin, href: builtin ? VARADHI_APP_URL : undefined } as AdSlide : null;
      }));
      if (!cancelled) {
        setSlides(built.filter((slide): slide is AdSlide => slide !== null));
        setIdx(0);
      }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(q.data), orgId]);

  // Auto-advance: videos linger longer than static images
  useEffect(() => {
    if (slides.length <= 1) return;
    const current = slides[idx % slides.length];
    const dwell = current?.kind === "video" ? 12000 : 6000;
    const t = window.setTimeout(() => setIdx((i) => (i + 1) % slides.length), dwell);
    return () => window.clearTimeout(t);
  }, [idx, slides]);

  // ---- Print suppression (unchanged behavior) ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    type PrintWindow = Window & {
      __mbrCleanPrintInstalled?: boolean;
      __mbrNativePrint?: () => void;
    };

    const win = window as PrintWindow;
    let restoreTimer: number | undefined;
    let lastPrintStartedAt = 0;

    const suppressAdBarForPrint = () => {
      lastPrintStartedAt = Date.now();
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
    const onAfterPrint = () => {
      const elapsed = Date.now() - lastPrintStartedAt;
      scheduleRestore(elapsed < 5_000 ? 60_000 : 1_000);
    };
    const onFocus = () => {
      if (document.documentElement.classList.contains("mbr-printing")) scheduleRestore(1_000);
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("focus", onFocus);

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
      window.removeEventListener("focus", onFocus);
      if (restoreTimer) window.clearTimeout(restoreTimer);
      if (win.__mbrCleanPrintInstalled && win.__mbrNativePrint) {
        window.print = win.__mbrNativePrint;
        delete win.__mbrNativePrint;
        delete win.__mbrCleanPrintInstalled;
      }
      restoreAdBarAfterPrint();
    };
  }, []);

  const marqueeLabels = useMemo(
    () => slides.map((s) => s.label).filter((l): l is string => !!l && l.trim().length > 0),
    [slides],
  );
  const marqueeText = marqueeLabels.join("   •   ");

  if (!slides.length) return null;

  return (
    <div
      className="mbr-global-ad-bar no-print print:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none m-0 p-0 overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="MBR advertisements"
    >
      <style>{`
        @keyframes mbrAdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mbrAdMarquee { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        .mbr-ad-slide { animation: mbrAdFadeIn 700ms ease-out both; }
        .mbr-ad-marquee-track { animation: mbrAdMarquee 22s linear infinite; }
      `}</style>
      <div className="w-full max-w-none pointer-events-auto m-0 p-0">
        <div className="relative overflow-hidden rounded-lg bg-market-header shadow-market w-full max-w-none aspect-[1200/128] m-0 p-0">
          {slides.map((s, i) => {
            const active = i === (idx % slides.length);
            return (
              <div
                key={s.id + ":" + i}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? "opacity-100 mbr-ad-slide" : "opacity-0"}`}
                style={{ pointerEvents: active ? "auto" : "none" }}
              >
                {s.kind === "video" ? (
                  <video
                    src={s.builtin ? undefined : s.src}
                    className="w-full h-full block object-contain bg-market-header"
                    aria-label={s.href ? "Vaaradhi promotion video" : s.label || "Advertisement video"}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  >
                    {s.builtin ? <><source src={promotionWebm.url} type="video/webm" /><source src={promotionVideo.url} type="video/mp4" /></> : null}
                  </video>
                ) : (
                  <img
                    src={s.src}
                    alt={s.label || "MBR platform advertisement"}
                    className="w-full h-full object-cover block"
                    loading="eager"
                    decoding="async"
                  />
                )}
                {s.href && active ? <a href={s.href} aria-label="Open Vaaradhi" className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-market-brand" /> : null}
              </div>
            );
          })}

          {marqueeText && !slides[idx % slides.length]?.href ? (
            <div className="absolute inset-x-0 bottom-0 h-6 overflow-hidden bg-gradient-to-t from-black/80 to-transparent">
              <div className="mbr-ad-marquee-track whitespace-nowrap text-white text-xs font-semibold tracking-wide leading-6 px-4">
                {marqueeText}   •   {marqueeText}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
