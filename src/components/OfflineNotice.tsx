import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const TEXT: Record<string, { title: string; body: string; retry: string }> = {
  te: {
    title: "ఇంటర్నెట్ కనెక్షన్ లేదు",
    body: "మీ మొబైల్ డేటా లేదా Wi‑Fi ఆన్ చేసి మళ్లీ ప్రయత్నించండి.",
    retry: "మళ్లీ ప్రయత్నించండి",
  },
  hi: {
    title: "इंटरनेट कनेक्शन नहीं है",
    body: "कृपया मोबाइल डेटा या Wi‑Fi चालू करके फिर से प्रयास करें।",
    retry: "फिर से प्रयास करें",
  },
  en: {
    title: "No internet connection",
    body: "Turn on mobile data or Wi‑Fi and try again.",
    retry: "Try again",
  },
};

/** Full-screen friendly notice shown whenever the device goes offline. */
export function OfflineNotice() {
  const { lang } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  const t = TEXT[lang] ?? TEXT.en;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur px-6"
    >
      <div className="max-w-sm text-center">
        <WifiOff className="mx-auto h-14 w-14 text-muted-foreground" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
        {lang !== "te" && (
          <p className="mt-3 text-sm text-muted-foreground">{TEXT.te.title} — {TEXT.te.body}</p>
        )}
        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) setOffline(false);
            else window.location.reload();
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t.retry}
        </button>
      </div>
    </div>
  );
}
