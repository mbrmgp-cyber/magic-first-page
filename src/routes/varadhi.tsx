import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Bell } from "lucide-react";

export const Route = createFileRoute("/varadhi")({
  head: () => ({
    meta: [
      { title: "Varadhi App — Coming Soon | MBR Platform" },
      { name: "description", content: "Varadhi — the next application on the MBR Platform. Coming soon." },
      { property: "og:title", content: "Varadhi App — Coming Soon" },
      { property: "og:description", content: "Varadhi — the next application on the MBR Platform. Coming soon." },
    ],
  }),
  component: VaradhiComingSoon,
});

function VaradhiComingSoon() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0f1b3d] text-[#f5f0e0] flex flex-col">
      {/* Ambient gold glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#c9a84c]/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#1e3a5f]/60 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#c9a84c]/10 blur-3xl" />
      </div>

      <header className="relative z-10 px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a84c]/30 bg-[#0f1b3d]/60 backdrop-blur px-3 py-1.5 text-xs text-[#f5f0e0]/90 hover:border-[#c9a84c] hover:bg-[#1e3a5f]/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Platform</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#c9a84c]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Coming Soon</span>
        </div>

        <h1 className="mt-8 font-serif text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-[#c9a84c] via-[#f0d78c] to-[#c9a84c] bg-clip-text text-transparent">
            Varadhi
          </span>
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-[#f5f0e0]/70 max-w-xl">
          The next application on the <span className="text-[#c9a84c]">MBR Platform</span>.
        </p>

        <p className="mt-3 text-sm text-[#f5f0e0]/50 max-w-md">
          A dedicated experience is being crafted. Details will be shared as we approach launch.
        </p>

        <div className="mt-10 flex items-center gap-2 text-xs text-[#f5f0e0]/50">
          <Bell className="h-3.5 w-3.5" />
          <span>varadhi.mbrplatform.com</span>
        </div>

        {/* Ornamental divider */}
        <div className="mt-14 flex items-center gap-3 text-[#c9a84c]/60">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a84c]/60" />
          <span className="text-[10px] uppercase tracking-[0.4em]">MBR Platform</span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a84c]/60" />
        </div>
      </main>
    </div>
  );
}
