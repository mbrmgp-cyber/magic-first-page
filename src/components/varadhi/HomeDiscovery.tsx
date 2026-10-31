import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Apple, Package, House, Truck, Wrench, ArrowUpRight, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import slideServices from "@/assets/varadhi-slide-services.jpg";
import slideTransport from "@/assets/varadhi-slide-transport.jpg";
import slideMarket from "@/assets/varadhi-slide-market.jpg";
import slideEstate from "@/assets/varadhi-slide-estate.jpg";

const slides = [
  { src: slideServices, title: "Paid & Free Services" },
  { src: slideTransport, title: "Vehicles & Machinery" },
  { src: slideMarket, title: "New, Used & Fresh Goods" },
  { src: slideEstate, title: "Flats & Land" },
];
const categories = [
  { id: "fresh", title: "Fresh Items", Icon: Apple, tone: "market-fresh" },
  { id: "goods", title: "New / Used Goods", Icon: Package, tone: "market-goods" },
  { id: "realestate", title: "Real Estate", Icon: House, tone: "market-estate" },
  { id: "transport", title: "Transport", Icon: Truck, tone: "market-transport" },
  { id: "services", title: "Services", Icon: Wrench, tone: "market-services" },
];

export function HomeDiscovery() {
  const { lang } = useI18n();
  const t = (source: string) => sharedTranslation(lang, source) ?? source;
  const [goodsOpen, setGoodsOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 4000);
    return () => window.clearInterval(id);
  }, []);


  return (
    <div data-no-translate>
      <section aria-label="Vaaradhi" className="relative mt-5 aspect-[2.2/1] overflow-hidden rounded-3xl border border-market-border bg-market-surface shadow-market-card">
        {slides.map((slide, index) => (
          <img key={slide.title} src={slide.src} alt={t(slide.title)} width={1760} height={800} loading={index === 0 ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-market-surface/90 px-3 pb-6 pt-2 text-center text-base font-bold leading-relaxed text-market-ink sm:text-2xl" aria-live="off">
          {t(slides[active]?.title ?? "Paid & Free Services")}
        </div>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((slide, index) => (
            <Button key={slide.title} type="button" variant="ghost" size="icon" aria-label={t(slide.title)} aria-pressed={index === active} onClick={() => setActive(index)} className={`h-2 min-h-0 rounded-full bg-background/90 p-0 transition-all hover:bg-background ${index === active ? "w-6" : "w-2 opacity-70"}`} />
          ))}
        </div>
      </section>
      <Dialog open={goodsOpen} onOpenChange={setGoodsOpen}>
        <DialogContent className="max-w-sm" data-no-translate><DialogHeader><DialogTitle>{t("New / Used Goods")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">{[{ id: "new", title: "New goods", Icon: Package }, { id: "used", title: "Used goods", Icon: Recycle }].map(({ id, title, Icon }) => <Button key={id} asChild variant="outline" className="h-auto min-h-24 flex-col whitespace-normal text-center"><Link to="/varadhi/browse/$category" params={{ category: id }} search={{ q: "" }} onClick={() => setGoodsOpen(false)}><Icon />{t(title)}</Link></Button>)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}