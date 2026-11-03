import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import usageVideo from "@/assets/videos/vaaradhi-how-to-use-telugu.mp4.asset.json";
import guidePoster from "@/assets/varadhi-slide-transport.jpg";

export function HomeUsageGuide() {
  const { lang } = useI18n();
  const t = (source: string) => sharedTranslation(lang, source) ?? source;
  const [videoOpen, setVideoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPlayback = () => {
    const video = videoRef.current;
    if (video) void video.play().catch(() => undefined);
  };

  return (
    <div className="mt-3" data-no-translate data-notranslit>
      <div className="grid grid-cols-2 gap-2">
        <Dialog open={videoOpen} onOpenChange={(open) => {
          if (!open) videoRef.current?.pause();
          setVideoOpen(open);
        }}>
          <Button variant="outline" onClick={() => setVideoOpen(true)} className="h-auto min-h-11 min-w-0 gap-1.5 whitespace-normal border-market-brand/30 bg-market-header px-2 py-2 text-xs font-semibold text-market-ink hover:bg-market-header/80 sm:text-sm">
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("app manual video")}
          </Button>
          <DialogContent aria-describedby={undefined} onOpenAutoFocus={startPlayback} className="w-[calc(100%-2rem)] max-w-3xl rounded-lg border-market-border bg-market-surface p-4 text-market-ink">
            <DialogTitle className="pr-8 text-base leading-relaxed">{t("app manual video")}</DialogTitle>
            <video ref={videoRef} controls autoPlay playsInline preload="auto" onCanPlay={startPlayback} poster={guidePoster} aria-label={t("Vaaradhi usage video")} className="aspect-video w-full rounded-lg bg-market-header object-contain">
              <source src={usageVideo.url} type="video/mp4" />
            </video>
          </DialogContent>
        </Dialog>
        <Button asChild className="h-auto min-h-11 min-w-0 gap-1.5 whitespace-normal bg-market-brand px-2 py-2 text-xs font-semibold text-market-on-brand hover:bg-market-brand/90 sm:text-sm">
          <Link to="/varadhi/admin-apply"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{t("Admin Form")}</Link>
        </Button>
      </div>
      <Button asChild variant="outline" className="mt-3 h-auto min-h-10 whitespace-normal border-market-border bg-market-surface text-market-ink hover:bg-market-header">
        <Link to="/varadhi/profile"><UserRound className="h-4 w-4" aria-hidden="true" />{t("Open Profile")}</Link>
      </Button>
    </div>
  );
}
