import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bi, useI18n } from "@/lib/i18n";
import promotionMp4 from "@/assets/videos/vaaradhi-promotion-silent.mp4.asset.json";
import promotionWebm from "@/assets/videos/vaaradhi-promotion-silent.webm.asset.json";

export const Route = createFileRoute("/varadhi/promotion")({
  head: () => ({ meta: [
    { title: "Vaaradhi Promotion Video — MBR Platform" },
    { name: "description", content: "Watch the silent Vaaradhi promotion for local business, services and transport." },
    { property: "og:title", content: "Vaaradhi Promotion Video" },
    { property: "og:description", content: "Vaaradhi local business, services and transport promotion." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PromotionPage,
});

function PromotionPage() {
  const { lang } = useI18n();
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
    <Button asChild variant="ghost"><Link to="/varadhi"><ArrowLeft className="h-4 w-4" />{bi("వారధి", "Vaaradhi", lang)}</Link></Button>
    <h1 className="text-xl font-semibold">{bi("వారధి ప్రమోషన్ వీడియో", "Vaaradhi promotion video", lang)}</h1>
    <video className="block aspect-[1200/128] w-full bg-market-header object-contain" aria-label="Vaaradhi promotion video" controls muted playsInline preload="auto">
      <source src={promotionWebm.url} type="video/webm" />
      <source src={promotionMp4.url} type="video/mp4" />
    </video>
    <Button asChild variant="outline"><a href={promotionMp4.url} download="vaaradhi-promotion-silent.mp4"><Download className="h-4 w-4" />{bi("వీడియో డౌన్‌లోడ్", "Download video", lang)}</a></Button>
  </main>;
}