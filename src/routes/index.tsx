import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Building2, Sparkles, ShieldCheck, Layers, Globe2 } from "lucide-react";
import logo from "@/assets/mbr-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBR Platform — Management of Board Resources" },
      {
        name: "description",
        content:
          "The MBR Platform hosts a suite of institutional applications — MBR App for society & committee administration, and Varadhi (coming soon).",
      },
      { property: "og:title", content: "MBR Platform — Management of Board Resources" },
      {
        property: "og:description",
        content:
          "A premium platform for institutional software. MBR App and Varadhi, unified under mbrplatform.com.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" && s.code.trim() ? s.code.trim() : undefined,
  }),
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
            <span>Go to Varadhi App</span>
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

          {/* Varadhi card */}
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
                  Product · Coming Soon
                </div>
              </div>
              <h3 className="mt-6 font-serif text-3xl font-semibold text-[#f5f0e0]/90">
                Varadhi
              </h3>
              <p className="mt-1 text-sm text-[#f5f0e0]/50">
                The next MBR Platform application
              </p>
              <p className="mt-4 text-sm text-[#f5f0e0]/60 leading-relaxed">
                A dedicated experience purpose-built on the shared MBR Platform foundation.
                Details will follow closer to launch.
              </p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f5f0e0]/70 group-hover:text-[#c9a84c] transition-colors">
                Preview Varadhi
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
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
            <Link to="/varadhi" className="hover:text-[#c9a84c] transition-colors">Varadhi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
