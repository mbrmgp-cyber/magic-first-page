import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { Apple, Package, House, Truck, Wrench, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import banner1 from "@/assets/varadhi-banner-1.jpg";
import banner2 from "@/assets/varadhi-banner-2.jpg";
import banner3 from "@/assets/varadhi-banner-3.jpg";

const banners = [
  { src: banner1, title: "Fresh finds, close to home", category: "fresh" },
  { src: banner2, title: "Transport made simple", category: "transport" },
  { src: banner3, title: "Local experts, ready to help", category: "services" },
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
  const [emblaRef, api] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [goodsOpen, setGoodsOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    return () => { api.off("select", update); };
  }, [api]);
  useEffect(() => {
    if (!api || paused || hovered || reducedMotion) return;
    const timer = setInterval(() => { if (!document.hidden) api.scrollNext(); }, 4500);
    return () => clearInterval(timer);
  }, [api, paused, hovered, reducedMotion]);

  return (
    <div data-no-translate>
      <section aria-roledescription="carousel" aria-label="Vaaradhi" className="mt-5" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setHovered(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
        <div ref={emblaRef} className="overflow-hidden rounded-lg bg-market-surface shadow-market">
          <div className="flex touch-pan-y">
            {banners.map((banner, index) => (
              <div key={banner.category} className="relative min-w-0 flex-[0_0_100%]" aria-hidden={selected !== index}>
                <img src={banner.src} alt={t(banner.title)} width={1200} height={600} className="aspect-[2/1] w-full object-contain" loading={index === 0 ? "eager" : "lazy"} />
                <div className="market-banner-caption absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-4 pt-8">
                  <h2 className="max-w-[70%] text-base font-bold leading-relaxed text-market-ink sm:text-lg">{t(banner.title)}</h2>
                  <Button asChild variant="ghost" size="icon" className="shrink-0 rounded-full bg-market-brand text-market-on-brand hover:bg-market-brand/90 hover:text-market-on-brand">
                    <Link to="/varadhi/browse/$category" params={{ category: banner.category }} search={{ q: "" }} tabIndex={selected === index ? 0 : -1} aria-label={`${t("Browse now")}: ${t(banner.title)}`}><ArrowRight /></Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {banners.map((banner, index) => <Button key={banner.category} variant="ghost" className="h-7 w-7 p-0 hover:bg-market-border/40" aria-label={t(banner.title)} aria-pressed={selected === index} onClick={() => api?.scrollTo(index)}><span className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${selected === index ? "w-5 bg-market-brand" : "w-1.5 bg-market-muted/40"}`} /></Button>)}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" className="h-8 w-8 p-0 text-market-muted" aria-label={t(paused ? "Play slideshow" : "Pause slideshow")} title={t(paused ? "Play slideshow" : "Pause slideshow")} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>
            <Button variant="ghost" className="h-8 w-8 p-0 text-market-muted" aria-label={t("Previous banner")} title={t("Previous banner")} onClick={() => api?.scrollPrev()}><ChevronLeft /></Button>
            <Button variant="ghost" className="h-8 w-8 p-0 text-market-muted" aria-label={t("Next banner")} title={t("Next banner")} onClick={() => api?.scrollNext()}><ChevronRight /></Button>
          </div>
        </div>
      </section>
      <section className="mt-5" aria-label={t("Explore categories")}>
        <h2 className="mb-3 text-base font-bold text-market-ink">{t("Explore categories")}</h2>
        <div className="grid grid-cols-6 gap-3 sm:grid-cols-5">
          {categories.map(({ id, title, Icon, tone }, index) => {
            const content = <><div className="flex w-full items-start justify-between"><span className="market-category-icon flex h-11 w-11 items-center justify-center rounded-lg"><Icon className="!h-6 !w-6" strokeWidth={1.7} /></span><ArrowUpRight className="mt-1 opacity-50" /></div><span className="mt-3 block whitespace-normal text-left text-[13px] font-bold leading-relaxed">{t(title)}</span></>;
            const className = `${tone} market-category col-span-2 ${index > 2 ? "col-span-3" : ""} sm:col-span-1 flex h-auto min-h-32 flex-col items-start justify-start rounded-lg border p-3 shadow-market-card transition-transform motion-safe:hover:-translate-y-1`;
            return id === "goods" ? <Button key={id} variant="ghost" className={className} onClick={() => setGoodsOpen(true)}>{content}</Button> : <Button key={id} asChild variant="ghost" className={className}><Link to="/varadhi/browse/$category" params={{ category: id }} search={{ q: "" }}>{content}</Link></Button>;
          })}
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