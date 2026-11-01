import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Handshake, Gift, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { VaradhiRegistrationForm } from "@/components/varadhi/RegistrationForm";

export const Route = createFileRoute("/varadhi/profile")({
  head: () => ({
    meta: [
      { title: "నా ప్రొఫైల్ — Vaaradhi" },
      { name: "description", content: "View your Vaaradhi registration and profile details, subscription, renewal and partner referrals." },
      { property: "og:title", content: "నా ప్రొఫైల్ — Vaaradhi" },
      { property: "og:description", content: "View your Vaaradhi registration and profile details, subscription, renewal and partner referrals." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VaradhiProfilePage,
});

function VaradhiProfilePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { lang } = useI18n();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <p className="p-6 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8 space-y-3">
      <h1 className="rounded-xl border border-market-brand/20 bg-market-header px-4 py-3 text-xl font-bold text-market-ink">నా ప్రొఫైల్</h1>

      <section aria-label="Vaaradhi registration / My profile" className="border-b border-border pb-5">
        <Button className="w-full justify-start" variant="outline" aria-expanded={profileOpen} aria-controls="vaaradhi-profile-details" onClick={() => setProfileOpen(v => !v)}>
          <User className="h-4 w-4" /><span data-no-translate>{sharedTranslation(lang, "Profile") ?? "Profile"}</span>
          <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
        </Button>
        {profileOpen && <div id="vaaradhi-profile-details" className="mt-4"><VaradhiRegistrationForm showRewardsLink={false} /></div>}
      </section>

      <Link to="/varadhi/subscription"
        className="flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-3 text-white font-semibold shadow">
        <CreditCard className="h-4 w-4" /> సబ్‌స్క్రిప్షన్ & రిన్యూవల్
      </Link>

      <Link to="/varadhi/partner"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#0d9488] px-4 py-3 text-white font-semibold shadow">
        <Handshake className="h-4 w-4" /> పార్ట్‌నర్ డాష్‌బోర్డ్ (రెఫరల్ & కమిషన్)
      </Link>

      <Link to="/varadhi/rewards"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#dc2626] px-4 py-3 text-white font-semibold shadow">
        <Gift className="h-4 w-4" /> బహుమతులు & పాయింట్లు
      </Link>

      <button
        onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/varadhi/auth" }); }}
        className="flex w-full items-center gap-2 rounded-xl border border-[#1e3a8a]/15 bg-white px-4 py-3 text-sm font-semibold text-[#1e3a8a]">
        <LogOut className="h-4 w-4" /> లాగ్ అవుట్
      </button>

      <DeleteAccountButton redirectTo="/varadhi" />
    </div>
  );
}
