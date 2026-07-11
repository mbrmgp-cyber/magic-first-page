import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDonor, getDonorAuctionView, getDonorActivities } from "@/lib/donors.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n, localizeText } from "@/lib/i18n";
import { HandHeart, User, IndianRupee, Award, Coins, Clock, LogOut, ArrowLeft, Eye, Trophy, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/donor/dashboard")({
  head: () => ({ meta: [{ title: "డోనర్ డాష్‌బోర్డ్" }] }),
  component: DonorDashboard,
});

function DonorDashboard() {
  const load = useServerFn(getMyDonor);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const [loading, setLoading] = useState(true);
  const [donor, setDonor] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [auctionView, setAuctionView] = useState<any>(null);
  const loadAuction = useServerFn(getDonorAuctionView);
  const loadActivities = useServerFn(getDonorActivities);
  const [activities, setActivities] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r: any = await load();
      setDonor(r.donor);
      setDonations(r.donations ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (donor?.status !== "approved" || donor?.linked_member?.id) return;
    loadAuction().then((r: any) => setAuctionView(r)).catch(() => {});
  }, [donor?.status, donor?.linked_member?.id]);

  useEffect(() => {
    if (donor?.status !== "approved") return;
    loadActivities().then((r: any) => {
      setActivities(r.activities ?? []);
      setMilestones(r.milestones ?? []);
    }).catch(() => {});
  }, [donor?.status]);

  useEffect(() => {
    if (!donor?.photo_url) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("member-photos")
        .createSignedUrl(donor.photo_url, 3600);
      if (!cancelled && data?.signedUrl) setPhotoUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [donor?.photo_url]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const total = Number(donor?.total_donated ?? 0);
  const fullName = donor ? [donor.first_name, donor.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white pb-16">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 text-sm hover:text-white">
            <ArrowLeft className="w-4 h-4" /> {lt("Home", "హోమ్")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button size="sm" variant="outline" onClick={signOut} className="border-white/20 text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-1" /> {lt("Logout", "లాగ్అవుట్")}
            </Button>
          </div>
        </header>

        {loading ? (
          <Card className="p-6 text-center bg-black/40 border-white/10 text-white/70">Loading…</Card>
        ) : !donor ? (
          <Card className="p-6 bg-black/40 border-white/10 space-y-3">
            <p className="text-white/80">{lt("No donor profile found for your account.", "మీ ఖాతాకి డోనర్ ప్రొఫైల్ కనపడలేదు.")}</p>
            <Link to="/donor/register"><Button className="bg-[#ff8c28] hover:bg-[#ff8c28]/90">{lt("Register as Donor", "డోనర్‌గా నమోదు")}</Button></Link>
          </Card>
        ) : donor.status !== "approved" ? (
          <Card className="p-6 bg-black/40 border-white/10 space-y-3 text-center">
            <Clock className="w-10 h-10 mx-auto text-amber-400" />
            <h2 className="text-lg font-semibold">{lt("Awaiting approval", "ఆమోదం కోసం వేచి ఉంది")}</h2>
            <p className="text-sm text-white/70">
              {lt("Your donor registration is pending admin approval.",
                  "మీ డోనర్ నమోదు అడ్మిన్ ఆమోదం కోసం పెండింగ్‌లో ఉంది.")}
            </p>
          </Card>
        ) : (
          <>
            <Card className="p-5 bg-gradient-to-br from-[#ff8c28]/20 to-black/40 border-[#ff8c28]/30">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                  {photoUrl ? <img src={photoUrl} className="h-full w-full object-cover" /> : <User className="w-8 h-8 text-white/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 uppercase tracking-wide">
                    {lt("Welcome, valued donor", "స్వాగతం, గౌరవ డోనర్")}
                  </p>
                  <h1 className="text-xl font-bold truncate">{fullName}</h1>
                  <p className="text-xs text-white/70 truncate">{donor.organizations?.name}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-black/40 border-white/10 text-center">
              <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
                <HandHeart className="w-4 h-4 text-[#ff8c28]" />
                {lt("Total contributed", "మొత్తం విరాళం")}
              </div>
              <div className="text-3xl font-bold mt-2 text-[#ff8c28]">
                ₹{total.toLocaleString("en-IN")}
              </div>
              {donor.momento_issued && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Award className="w-3 h-3" /> {lt("Momento presented", "మెమెంటో అందించబడింది")}
                </div>
              )}
            </Card>

            {donor.linked_member?.id && (
              <Card className="p-4 bg-black/40 border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{lt("Chit / Member details", "చిట్టీ / సభ్య వివరాలు")}</p>
                  <p className="text-xs text-white/60">
                    {donor.linked_member.name} {donor.linked_member.member_code ? `(${donor.linked_member.member_code})` : ""}
                  </p>
                </div>
                <Link to="/member/ledger">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Coins className="w-4 h-4 mr-1" /> {lt("Open", "తెరవండి")}
                  </Button>
                </Link>
              </Card>
            )}

            {!donor.linked_member?.id && auctionView?.session && (
              <Card className="p-4 bg-black/40 border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-400" />
                    {lt("Live Chit Progress", "లైవ్ చిట్టీ ప్రోగ్రెస్")}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                    <Eye className="w-3 h-3" /> {lt("View only", "వీక్షణ మాత్రమే")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-white/50">{lt("Group", "గ్రూప్")}</div>
                    <div className="font-semibold">{auctionView.groupName ?? "-"}</div>
                  </div>
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-white/50">{lt("Chit value", "చిట్టీ విలువ")}</div>
                    <div className="font-semibold">₹{Number(auctionView.session.chit_value ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-white/50">{lt("Month", "నెల")}</div>
                    <div className="font-semibold">{auctionView.session.current_month ?? 1} / {auctionView.session.total_months ?? "-"}</div>
                  </div>
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-white/50">{lt("Members", "సభ్యులు")}</div>
                    <div className="font-semibold">{auctionView.session.total_members ?? "-"}</div>
                  </div>
                </div>
                {auctionView.session.winner_member_name && !auctionView.session.auction_closed && (
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs">
                    <div className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                      <Trophy className="w-3 h-3" /> {lt("Current winner", "ప్రస్తుత విజేత")}
                    </div>
                    <div className="text-white/80 mt-1">
                      {auctionView.session.winner_member_name}
                      {auctionView.session.winner_member_code ? ` (${auctionView.session.winner_member_code})` : ""}
                      {auctionView.session.winner_amount ? ` — ₹${Number(auctionView.session.winner_amount).toLocaleString("en-IN")}` : ""}
                    </div>
                  </div>
                )}
                {Array.isArray(auctionView.session.past_winners) && auctionView.session.past_winners.length > 0 && (
                  <div>
                    <div className="text-[11px] text-white/50 mb-1">{lt("Past winners", "గత విజేతలు")}</div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {auctionView.session.past_winners.slice().reverse().map((w: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs border-b border-white/5 last:border-0 pb-1">
                          <span className="text-white/70">M{w.month}: {w.memberName ?? w.member_name ?? "-"}</span>
                          <span className="text-white/60">₹{Number(w.net ?? w.amount ?? 0).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-white/40">
                  {lt("You are viewing live chit progress as a donor. Bidding is limited to enrolled members.",
                      "మీరు డోనర్‌గా లైవ్ చిట్టీని వీక్షిస్తున్నారు. బిడ్డింగ్ నమోదైన సభ్యులకు మాత్రమే.")}
                </p>
              </Card>
            )}

            <Card className="p-4 bg-black/40 border-white/10">
              <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                {lt("Donation history", "విరాళాల చరిత్ర")}
              </h3>
              {donations.length === 0 ? (
                <p className="text-sm text-white/60">{lt("No donations recorded yet.", "ఇంకా విరాళాలు నమోదు కాలేదు.")}</p>
              ) : (
                <div className="space-y-2">
                  {donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between border-b border-white/10 last:border-0 pb-2 last:pb-0">
                      <div>
                        <div className="text-sm font-semibold">
                          ₹{Number(d.amount).toLocaleString("en-IN")}
                          <span className="text-xs text-white/50 ml-2">({d.mode})</span>
                        </div>
                        <div className="text-xs text-white/60">
                          {new Date(d.donation_date).toLocaleDateString("te-IN")}
                          {d.receipt_no ? ` • Rcpt: ${d.receipt_no}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
