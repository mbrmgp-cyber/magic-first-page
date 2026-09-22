import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Building2, Sparkles, ShieldCheck, Layers, Globe2 } from "lucide-react";
import logo from "@/assets/mbr-logo.png.asset.json";

const FAQS = [
  {
    q: "What is the MBR Platform?",
    a: "MBR Platform (Management of Board Resources) is an Indian institutional software platform hosted at mbrplatform.com. It currently runs two applications: the MBR App for registered societies and committees, and Vaaradhi, a Telugu-first local marketplace.",
  },
  {
    q: "How does a member join a society on the MBR App?",
    a: "The society shares its QR code or join link. The member fills in name, father's name, village, PIN code, email, phone, blood group, and introducer, and uploads a photo and payment receipt. The committee reviews the request and, on approval, the member receives a permanent society ID and a login link to their dashboard.",
  },
  {
    q: "Can members pay the society through the app?",
    a: "Yes. Administrators save the society's bank details once, and the member dashboard shows a Pay to Society card with the account name, number, IFSC, and branch, so members can transfer and upload the receipt.",
  },
  {
    q: "Is member data private?",
    a: "Yes. Data is protected with row-level security and role-based access. Bank account numbers and identity documents are readable only by authorised administrators, not by other members, and every approval is recorded against the user who made it.",
  },
  {
    q: "Does the platform work in Telugu?",
    a: "Yes. Both apps are bilingual. Members and sellers can read and enter content in Telugu or English, and the interface follows the language selected on the device.",
  },
  {
    q: "What does Vaaradhi do?",
    a: "Vaaradhi connects local sellers, transporters, and service providers with buyers around them. Listings show photos, price, unit, stock status, and location, and buyers can browse by state, district, and mandal or see updates within about 100 km of where they are.",
  },
];


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBR Platform — Society Management & Local Marketplace" },
      {
        name: "description",
        content:
          "MBR Platform runs the MBR App for society, committee, election, accounts and chit management in India, and Vaaradhi, a Telugu-first local marketplace.",
      },
      { property: "og:title", content: "MBR Platform — Society Management & Local Marketplace" },
      {
        property: "og:description",
        content:
          "Member registration, ID cards, committees, elections, accounts, loans and chit auctions on the MBR App — plus Vaaradhi, a Telugu local marketplace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "MBR Platform",
              url: "https://mbrplatform.com",
              inLanguage: ["en", "te"],
            },
            {
              "@type": "SoftwareApplication",
              name: "MBR App",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://mbrplatform.com/mbr",
              description:
                "Society and committee administration: member registration, QR ID cards, elections, accounts, loans, chit auctions, disciplinary workflow and member chat.",
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            },
          ],
        }),
      },
    ],
  }),

  validateSearch: (s: Record<string, unknown>): { code?: string } => {
    const code = typeof s.code === "string" && s.code.trim() ? s.code.trim() : undefined;
    return code ? { code } : {};
  },
  component: PlatformPortal,
});

function PlatformPortal() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  // Preserve legacy join-flow: /?code=XYZ → member registration
  useEffect(() => {
    if (code) {
      navigate({ to: "/member/register", search: { code }, replace: true });
    }
  }, [code, navigate]);
  // NOTE: do NOT auto-redirect signed-in users away from the portal — it made
  // both app links land on the MBR interface. The portal must always let the
  // user choose between MBR App and Vaaradhi App.
  if (code) return null;


  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0f1b3d] text-[#f5f0e0]">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#c9a84c]/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#1e3a5f]/80 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#c9a84c]/10 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
        <div className="flex items-center gap-3">
          <img
            src={logo.url}
            alt="MBR Platform"
            className="h-9 w-9 rounded-md ring-1 ring-[#c9a84c]/40"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-[#f5f0e0]">
              MBR <span className="text-[#c9a84c]">Platform</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#f5f0e0]/50">
              mbrplatform.com
            </div>
          </div>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-[#f5f0e0]/70">
          <a href="#products" className="hover:text-[#c9a84c] transition-colors">Products</a>
          <a href="#platform" className="hover:text-[#c9a84c] transition-colors">Platform</a>
          <Link to="/mbr" className="hover:text-[#c9a84c] transition-colors">Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-10 pt-16 sm:pt-24 pb-12 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-[#c9a84c]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Institutional software, unified</span>
        </div>

        <h1 className="mt-8 font-serif text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Management of{" "}
          <span className="bg-gradient-to-r from-[#c9a84c] via-[#f0d78c] to-[#c9a84c] bg-clip-text text-transparent">
            Board
          </span>{" "}
          Resources
          <span className="mt-3 block font-sans text-base sm:text-lg font-normal text-[#f5f0e0]/60">
            MBR Platform — Institutional Software and Local Marketplace
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#f5f0e0]/70 max-w-2xl mx-auto leading-relaxed">
          A premium platform hosting a suite of purpose-built applications for societies,
          committees, and communities. One identity, many tools.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/mbr"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-6 py-3.5 text-sm font-semibold text-[#0f1b3d] shadow-[0_10px_40px_-10px_rgba(201,168,76,0.6)] hover:bg-[#f0d78c] transition-all"
          >
            <span>Go to MBR App</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/varadhi"
            className="group inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9a84c]/40 bg-[#0f1b3d]/40 backdrop-blur px-6 py-3.5 text-sm font-semibold text-[#f5f0e0] hover:border-[#c9a84c] hover:bg-[#1e3a5f]/60 transition-all"
          >
            <span>Go to Vaaradhi App</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </section>

      {/* Products */}
      <section id="products" className="relative z-10 px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* MBR App card */}
          <Link
            to="/mbr"
            className="group relative rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-[#1e3a5f]/50 to-[#0f1b3d]/50 backdrop-blur p-8 hover:border-[#c9a84c] transition-all overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#c9a84c]/10 blur-3xl group-hover:bg-[#c9a84c]/20 transition-all" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 p-3">
                  <Building2 className="h-6 w-6 text-[#c9a84c]" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a84c]/80">
                  Product · Live
                </div>
              </div>
              <h3 className="mt-6 font-serif text-3xl font-semibold">MBR App</h3>
              <p className="mt-1 text-sm text-[#f5f0e0]/60">
                Society &amp; Committee Administration
              </p>
              <p className="mt-4 text-sm text-[#f5f0e0]/70 leading-relaxed">
                End-to-end tools for member registration, committees, elections, accounts,
                donors, auctions, disciplinary workflows, and secure member-to-committee chat.
              </p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#c9a84c]">
                Open MBR App
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Vaaradhi card */}
          <Link
            to="/varadhi"
            className="group relative rounded-2xl border border-[#c9a84c]/15 bg-gradient-to-br from-[#0f1b3d]/80 to-[#1e3a5f]/30 backdrop-blur p-8 hover:border-[#c9a84c]/50 transition-all overflow-hidden"
          >
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#c9a84c]/5 blur-3xl group-hover:bg-[#c9a84c]/15 transition-all" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-3">
                  <Sparkles className="h-6 w-6 text-[#c9a84c]/80" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a84c]/60">
                  Product · Live
                </div>
              </div>
              <h3 className="mt-6 font-serif text-3xl font-semibold text-[#f5f0e0]/90">
                Vaaradhi (వారధి)
              </h3>
              <p className="mt-1 text-sm text-[#f5f0e0]/50">
                Local marketplace for Andhra Pradesh &amp; Telangana
              </p>
              <p className="mt-4 text-sm text-[#f5f0e0]/60 leading-relaxed">
                A Telugu-first marketplace where farmers, shops, transporters, and service
                providers post what they have — fresh produce, new and used goods, property,
                vehicles, and services — and buyers discover them within 100 km, filtered by
                state, district, and mandal.
              </p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f5f0e0]/70 group-hover:text-[#c9a84c] transition-colors">
                Open Vaaradhi
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* What MBR App does — depth for members, committees and admins */}
      <section id="features" className="relative z-10 px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold">
          What you can run on the MBR App
        </h2>
        <p className="mt-4 max-w-3xl text-sm sm:text-base text-[#f5f0e0]/70 leading-relaxed">
          The MBR App is built for registered societies, welfare associations, and community
          committees in India. Every module below replaces a paper register: members are
          issued a permanent society ID (for example <span className="text-[#c9a84c]">A/0001</span>),
          money movements are receipted, and every approval is recorded against the person who
          made it.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              title: "Member registration & ID cards",
              body: "Members join by scanning the society QR code or opening a link, then upload photo, address, blood group, and introducer details. Once the committee approves, the system assigns the next society ID and generates a printable, QR-verified ID card that anyone can scan to confirm membership.",
            },
            {
              title: "Committee & election management",
              body: "Maintain the executive committee with roles (president, vice-president, treasurer, executive, advisor, worker) and term dates. Run nominations and voting for scheduled elections, and let permissions follow the elected role automatically.",
            },
            {
              title: "Accounts, loans & cash flow",
              body: "Record subscriptions, donations, registration fees, expenses, and charity spending. Issue monthly member loans with monthly interest, print an Indian-style promissory note with two signatures, and track balances in the master ledger with multi-currency display for members working abroad.",
            },
            {
              title: "Chit auctions",
              body: "Run monthly chit auctions with member bidding, foreman rules, dividend and net payable calculation, digital consent from participants, and an archive of every closed month.",
            },
            {
              title: "Disciplinary & leave workflow",
              body: "A separate disciplinary committee reviews suspensions and reviews requests from members who want to leave the society, so pending dues and obligations are settled before a membership is closed.",
            },
            {
              title: "Announcements & private chat",
              body: "Committees publish announcements to all members and can also send private information to selected members or only to the committee, keeping sensitive matters off public boards.",
            },
          ].map(({ title, body }) => (
            <article
              key={title}
              className="rounded-xl border border-[#c9a84c]/15 bg-[#0f1b3d]/40 p-6"
            >
              <h3 className="font-semibold text-[#f5f0e0]">{title}</h3>
              <p className="mt-2 text-sm text-[#f5f0e0]/65 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Who it is for */}
      <section id="who" className="relative z-10 px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold">Who uses MBR Platform</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              title: "Society administrators",
              body: "Approve new members, correct member IDs, manage bank details shown to members for payments, control which committee role can open which module, and export the full member register as a PDF.",
            },
            {
              title: "Members",
              body: "Open a personal dashboard to see their ID card, ledger, loan requests, society bank details for payments, meeting and event notices, and to raise a leave request with a written reason.",
            },
            {
              title: "Local sellers & service providers",
              body: "On Vaaradhi, post produce, goods, vehicles, transport, and services in Telugu or English with photos, price per unit, stock status, and a direct phone or WhatsApp contact.",
            },
          ].map(({ title, body }) => (
            <article key={title} className="rounded-xl border border-[#c9a84c]/15 bg-[#0f1b3d]/40 p-6">
              <h3 className="font-semibold text-[#f5f0e0]">{title}</h3>
              <p className="mt-2 text-sm text-[#f5f0e0]/65 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold">Common questions</h2>
        <div className="mt-6 space-y-4">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-[#c9a84c]/15 bg-[#0f1b3d]/40 p-5"
            >
              <summary className="cursor-pointer list-none font-semibold text-[#f5f0e0] marker:hidden">
                {q}
              </summary>
              <p className="mt-3 text-sm text-[#f5f0e0]/65 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>


      {/* Platform pillars */}
      <section id="platform" className="relative z-10 px-6 sm:px-10 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9a84c]/30" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#c9a84c]/80">
            One Platform
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9a84c]/30" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: ShieldCheck,
              title: "Secure by design",
              body: "Row-level security, role-based access, and audited workflows across every application.",
            },
            {
              icon: Layers,
              title: "Modular architecture",
              body: "Each app runs on its own subdomain with isolated layouts — shared identity, independent surfaces.",
            },
            {
              icon: Globe2,
              title: "Built for communities",
              body: "Multilingual, mobile-first, and shaped around how societies actually operate.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-[#c9a84c]/15 bg-[#0f1b3d]/40 p-6"
            >
              <Icon className="h-5 w-5 text-[#c9a84c]" />
              <h4 className="mt-4 font-semibold text-[#f5f0e0]">{title}</h4>
              <p className="mt-2 text-sm text-[#f5f0e0]/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#c9a84c]/10 px-6 sm:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#f5f0e0]/50">
          <div>© {new Date().getFullYear()} MBR Platform. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/mbr" className="hover:text-[#c9a84c] transition-colors">MBR App</Link>
            <Link to="/varadhi" className="hover:text-[#c9a84c] transition-colors">Vaaradhi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
