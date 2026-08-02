import { useEffect, useState } from "react";
import { resolveListingImage } from "@/lib/varadhi.functions";

const cache = new Map<string, string>();

/**
 * Listing photos are kept in private storage buckets, so a raw storage path
 * cannot be used directly in <img src>. This resolves a path to a temporary
 * signed URL (values that are already http(s) URLs pass through untouched).
 */
export function useListingImage(path?: string | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    return cache.get(path) ?? null;
  });

  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    if (/^https?:\/\//.test(path)) { setUrl(path); return; }
    const cached = cache.get(path);
    if (cached) { setUrl(cached); return; }
    (async () => {
      try {
        const res: any = await resolveListingImage({ data: { path } });
        if (!alive) return;
        if (res?.url) {
          cache.set(path, res.url);
          setUrl(res.url);
        } else setUrl(null);
      } catch {
        if (alive) setUrl(null);
      }
    })();
    return () => { alive = false; };
  }, [path]);

  return url;
}
