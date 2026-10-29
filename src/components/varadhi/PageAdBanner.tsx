import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdPage = "home" | "search" | "dashboard" | "profile";

export function pageForPath(path: string): AdPage | null {
  if (path === "/varadhi" || path === "/varadhi/") return "home";
  if (path.startsWith("/varadhi/browse")) return "search";
  if (path.startsWith("/varadhi/dashboard")) return "dashboard";
  if (path.startsWith("/varadhi/profile")) return "profile";
  return null;
}

type Ad = { id: string; image_url: string; link_url: string | null; phone: string | null; title: string | null; src?: string };

export async function signAdImages<T extends { image_url: string }>(ads: T[]) {
  if (!ads.length) return ads.map((a) => ({ ...a, src: "" }));
  const { data } = await supabase.storage.from("varadhi-ads").createSignedUrls(ads.map((a) => a.image_url), 3600);
  return ads.map((a, i) => ({ ...a, src: data?.[i]?.signedUrl ?? "" }));
}

export function PageAdBanner({ page }: { page: AdPage }) {
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase
        .from("varadhi_page_ads")
        .select("id,image_url,link_url,phone,title")
        .eq("page", page)
        .eq("active", true)
        .order("sort_order");
      const signed = await signAdImages((data ?? []) as Ad[]);
      if (on) setAds(signed.filter((a) => a.src));
    })();
    return () => { on = false; };
  }, [page]);

  if (!ads.length) return null;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-3 space-y-2" aria-label="Local ads">
      <p className="text-[10px] uppercase tracking-wide opacity-60">ప్రకటన · Ad</p>
      {ads.map((a) => {
        const href = a.phone ? `tel:${a.phone.replace(/\s+/g, "")}` : a.link_url || undefined;
        const img = <img src={a.src} alt={a.title ?? "Local ad"} loading="lazy" className="block w-full aspect-[4.4/1] rounded-2xl border object-cover shadow-sm" />;
        return href ? (
          <a key={a.id} href={href} target={a.phone ? undefined : "_blank"} rel="noopener noreferrer" className="block">{img}</a>
        ) : <div key={a.id}>{img}</div>;
      })}
    </div>
  );
}
