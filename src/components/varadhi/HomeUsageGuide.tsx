import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check, HandHeart, Search, Sprout, Store, Upload, UserRound, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import farmerPhoto from "@/assets/vaaradhi-guide-farmer.jpg";
import traderPhoto from "@/assets/vaaradhi-guide-trader.jpg";
import providerPhoto from "@/assets/vaaradhi-guide-provider.jpg";
import workerPhoto from "@/assets/vaaradhi-guide-worker.jpg";
import usageVideo from "@/assets/videos/vaaradhi-how-to-use-telugu.mp4.asset.json";
import guidePoster from "@/assets/varadhi-slide-transport.jpg";

const registration = { title: "Complete your profile", detail: "Log in and open Profile to complete your registration and contact details before posting.", Icon: UserRound };
const connect = { title: "Connect & keep details current", detail: "People can find your post by area and use its contact details. Keep the price and availability up to date in Upload.", Icon: Check };
const audiences = [
  { id: "farmers", label: "Farmers", headline: "Sell your harvest locally", photo: farmerPhoto, Icon: Sprout, category: "fresh", steps: [registration, { title: "Post fresh produce", detail: "In Upload, choose Business → Fresh Items. Add the crop photo, price, unit, available quantity and location.", Icon: Upload }, connect] },
  { id: "traders", label: "Traders", headline: "Bring your shop closer to customers", photo: traderPhoto, Icon: Store, category: "new", steps: [registration, { title: "Post your goods", detail: "In Upload, choose Business and the matching goods category. Add photos, price, stock and shop location.", Icon: Upload }, connect] },
  { id: "providers", label: "Service providers", headline: "Connect your skills with local needs", photo: providerPhoto, Icon: Wrench, category: "services", steps: [registration, { title: "Post your service", detail: "In Upload, choose Services and your profession. Add your skill, fee, experience, service area and contact details.", Icon: Upload }, connect] },
  { id: "workers", label: "Workers & helpers", headline: "Offer your work or lend a helping hand", photo: workerPhoto, Icon: HandHeart, category: "services", steps: [registration, { title: "Post work or free help", detail: "In Upload, choose Services for paid work or Free Services for voluntary help. Add your work, area, timing and phone.", Icon: Upload }, { title: "Find & contact locally", detail: "Use Search with a work name and area. Open a matching post and contact the person using the details shown.", Icon: Search }] },
];

export function HomeUsageGuide() {
  const { lang } = useI18n();
  const t = (source: string) => sharedTranslation(lang, source) ?? source;
  const [audience, setAudience] = useState("farmers");
  const [step, setStep] = useState(0);

  return (
    <section aria-labelledby="vaaradhi-guide-title" className="mt-6 border-y border-market-border py-5" data-no-translate data-notranslit>
      <div className="mb-4 flex items-start gap-3">
        <BookOpen className="mt-1 h-5 w-5 shrink-0 text-market-brand" aria-hidden="true" />
        <div>
          <p className="text-xs font-medium text-market-muted">{t("Vaaradhi for everyone")}</p>
          <h2 id="vaaradhi-guide-title" className="mt-1 text-lg font-bold leading-relaxed text-market-ink">{t("How to Use Vaaradhi App")}</h2>
        </div>
      </div>
      <div className="mb-5">
        <video controls playsInline preload="none" poster={guidePoster} aria-label={t("Vaaradhi usage video")} className="aspect-video w-full rounded-lg bg-market-header object-contain">
          <source src={usageVideo.url} type="video/mp4" />
        </video>
        <p className="mt-2 text-xs font-medium text-market-muted">{t("All sections · Telugu video")} · 2:43</p>
      </div>
      <Tabs value={audience} onValueChange={(value) => { setAudience(value); setStep(0); }}>
        <TabsList aria-label={t("Vaaradhi for everyone")} className="grid h-auto w-full grid-cols-2 gap-1 bg-market-header p-1 sm:grid-cols-4">
          {audiences.map(({ id, label, Icon }) => <TabsTrigger key={id} value={id} className="min-h-12 gap-2 whitespace-normal px-2 text-xs leading-relaxed text-market-ink data-[state=active]:bg-market-brand data-[state=active]:text-market-on-brand"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{t(label)}</TabsTrigger>)}
        </TabsList>
        {audiences.map((group) => {
          const current = group.steps[step];
          if (!current) return null;
          const StepIcon = current.Icon;
          return <TabsContent key={group.id} value={group.id} className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <img src={group.photo} alt={t(group.label)} width={992} height={672} loading="lazy" className="aspect-[3/2] w-full rounded-lg object-cover" />
                <h3 className="mt-3 text-base font-semibold leading-relaxed text-market-ink">{t(group.headline)}</h3>
              </div>
              <div className="min-w-0">
                <div className="grid grid-cols-3 gap-2" aria-label={t("Step")}>
                  {group.steps.map(({ title, Icon }, index) => <Button key={title} variant="outline" aria-label={`${t("Step")} ${index + 1}: ${t(title)}`} aria-pressed={step === index} onClick={() => setStep(index)} className={`h-11 gap-2 border-market-border ${step === index ? "bg-market-brand text-market-on-brand hover:bg-market-brand/90 hover:text-market-on-brand" : "bg-market-surface text-market-muted hover:bg-market-header hover:text-market-ink"}`}><span>{index + 1}</span><Icon className="h-4 w-4" aria-hidden="true" /></Button>)}
                </div>
                <div className="min-h-44 pt-4 sm:min-h-52" aria-live="polite" aria-atomic="true">
                  <p className="flex items-center gap-2 text-xs font-semibold text-market-brand"><StepIcon className="h-4 w-4" aria-hidden="true" />{t("Step")} {step + 1} / 3</p>
                  <h4 className="mt-2 text-base font-semibold leading-relaxed text-market-ink">{t(current.title)}</h4>
                  <p className="mt-2 text-sm leading-7 text-market-muted">{t(current.detail)}</p>
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="ghost" size="icon" disabled={step === 0} aria-label={t("Previous step")} title={t("Previous step")} onClick={() => setStep((value) => Math.max(0, value - 1))} className="text-market-brand"><ArrowLeft /></Button>
                  <Button variant="ghost" size="icon" disabled={step === 2} aria-label={t("Next step")} title={t("Next step")} onClick={() => setStep((value) => Math.min(2, value + 1))} className="text-market-brand"><ArrowRight /></Button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-market-border pt-4">
              <Button asChild className="h-auto min-h-10 whitespace-normal bg-market-brand text-market-on-brand hover:bg-market-brand/90"><Link to={step === 0 ? "/varadhi/profile" : "/varadhi/dashboard"}>{step === 0 ? <UserRound /> : <Upload />}{t(step === 0 ? "Open Profile" : "Open Upload")}</Link></Button>
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal border-market-border bg-market-surface text-market-ink hover:bg-market-header"><Link to="/varadhi/browse/$category" params={{ category: group.category }} search={{ q: "" }}><Search />{t("Find nearby")}</Link></Button>
            </div>
          </TabsContent>;
        })}
      </Tabs>
    </section>
  );
}