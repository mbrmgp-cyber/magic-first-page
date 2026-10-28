import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Apple, Package, House, Truck, Wrench, ArrowUpRight, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import photoMarket from "@/assets/varadhi-photo-market.jpg";
import photoTransport from "@/assets/varadhi-photo-transport.jpg";
import photoServices from "@/assets/varadhi-photo-services.jpg";

const banners = [
  { src: photoMarket, title: "Fresh finds, close to home", category: "fresh" },
  { src: photoTransport, title: "Transport made simple", category: "transport" },
  { src: photoServices, title: "Local experts, ready to help", category: "services" },
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


  return (
    <div data-no-translate>
      <section aria-label="Vaaradhi" className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {banners.map((banner, index) => (
          <Link key={banner.category} to="/varadhi/browse/$category" params={{ category: banner.category }} search={{ q: "" }} className="group overflow-hidden rounded-lg border border-market-border bg-market-surface shadow-market-card">
            <img src={banner.src} alt={t(banner.title)} width={1024} height={768} className="aspect-[4/3] w-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
            <span className="block px-2 py-1.5 text-xs font-semibold leading-snug text-market-ink sm:text-sm">{t(banner.title)}</span>
          </Link>
        ))}
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