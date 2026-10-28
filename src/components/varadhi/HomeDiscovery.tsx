import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Apple, Package, House, Truck, Wrench, ArrowUpRight, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import photoServices from "@/assets/varadhi-category-services.jpg";
import photoMarket from "@/assets/varadhi-category-fresh.jpg";
import photoGoods from "@/assets/varadhi-category-goods.jpg";
import photoEstate from "@/assets/varadhi-category-estate.jpg";
import photoTransport from "@/assets/varadhi-category-transport.jpg";

const banners = [
  { src: photoServices, title: "Services", category: "services", width: 1024, height: 768 },
  { src: photoMarket, title: "Fresh Items", category: "fresh", width: 1024, height: 768 },
  { src: photoGoods, title: "New / Used Goods", category: "goods", width: 1024, height: 768 },
  { src: photoEstate, title: "Real Estate", category: "realestate", width: 1024, height: 768 },
  { src: photoTransport, title: "Transport", category: "transport", width: 1536, height: 864 },
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
      <section aria-label="Vaaradhi" className="mt-5 grid grid-cols-6 gap-3">
        {banners.map((banner, index) => {
          const content = <><img src={banner.src} alt={t(banner.title)} width={banner.width} height={banner.height} className="w-full" loading={index === 0 ? "eager" : "lazy"} /><span className="block px-3 py-2 text-sm font-semibold leading-snug text-market-ink">{t(banner.title)}</span></>;
          const className = `col-span-3 ${index === 4 ? "col-span-6" : ""} ${index < 3 ? "sm:col-span-2" : "sm:col-span-3"} block h-auto overflow-hidden whitespace-normal rounded-lg border border-market-border bg-market-surface p-0 text-left shadow-market-card`;
          return banner.category === "goods" ? <Button key={banner.category} variant="ghost" className={className} onClick={() => setGoodsOpen(true)}>{content}</Button> : <Button key={banner.category} asChild variant="ghost" className={className}><Link to="/varadhi/browse/$category" params={{ category: banner.category }} search={{ q: "" }}>{content}</Link></Button>;
        })}
      </section>
      <Dialog open={goodsOpen} onOpenChange={setGoodsOpen}>
        <DialogContent className="max-w-sm" data-no-translate><DialogHeader><DialogTitle>{t("New / Used Goods")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">{[{ id: "new", title: "New goods", Icon: Package }, { id: "used", title: "Used goods", Icon: Recycle }].map(({ id, title, Icon }) => <Button key={id} asChild variant="outline" className="h-auto min-h-24 flex-col whitespace-normal text-center"><Link to="/varadhi/browse/$category" params={{ category: id }} search={{ q: "" }} onClick={() => setGoodsOpen(false)}><Icon />{t(title)}</Link></Button>)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}