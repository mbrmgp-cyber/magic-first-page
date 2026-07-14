import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { verifyMemberByCode } from "@/lib/member-verify.functions";
import { ShieldCheck, User, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/m/$code")({
  head: () => ({
    meta: [
      { title: "Member Verification — MBR" },
      { name: "description", content: "Verify society member identity by scanning the ID card QR." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberVerifyPage,
});

function MemberVerifyPage() {
  const { code } = Route.useParams();
  const verify = useServerFn(verifyMemberByCode);
  const q = useQuery({
    queryKey: ["verify-member", code],
    queryFn: () => verify({ data: { code } }),
  });

  const brand = (q.data?.org?.theme_color as string) || "#ff8c28";
  const themeStyle = {
    background: `radial-gradient(1200px 500px at 50% -10%, ${brand}33 0%, rgba(0,0,0,0) 55%), linear-gradient(to bottom right, #0a0a0a, #16181d 55%, #000000)`,
  } as React.CSSProperties;

  if (q.isLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">లోడ్ అవుతోంది…</div>;
  }

  const m: any = q.data?.member;
  const org: any = q.data?.org;
  const photoUrl = q.data?.photoUrl;

  if (!m) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-6" style={themeStyle}>
        <div className="max-w-sm w-full text-center space-y-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6">
          <XCircle className="h-14 w-14 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold">సభ్యుడు కనిపించలేదు</h2>
          <p className="text-sm text-white/70">Member code <span className="font-mono">{code}</span> కు సరిపోయే approved member లేదు.</p>
        </div>
      </div>
    );
  }

  const first = m.first_name ?? (m.name?.split(" ")[0] ?? "");
  const last = m.last_name ?? (m.name?.split(" ").slice(1).join(" ") ?? "");
  const active = m.is_active !== false;

  return (
    <div className="min-h-screen text-white p-4" style={themeStyle}>
      <div className="max-w-md mx-auto space-y-5 pt-6">
        <header className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-white/20">
            {org?.logo_url
              ? <img src={org.logo_url} alt="" className="h-full w-full object-contain p-1" />
              : <ShieldCheck className="h-7 w-7 text-black" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/60">Society</p>
            <p className="text-sm font-semibold truncate">{org?.name || "—"}</p>
          </div>
        </header>

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: `${brand}66` }}>
            {photoUrl
              ? <img src={photoUrl} alt={m.name} className="h-full w-full object-cover" />
              : <User className="h-12 w-12 text-zinc-600" strokeWidth={1.5} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold truncate leading-tight">{first || "—"}</p>
            <p className="text-xl font-bold truncate leading-tight">{last}</p>
            <p className="text-xs text-white/60 mt-2">Member ID</p>
            <p className="text-sm font-mono">{m.member_code || "—"}</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${active ? "border-emerald-700/60 bg-emerald-950/30" : "border-zinc-800 bg-zinc-950/60"}`}>
          {active
            ? <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            : <XCircle className="h-6 w-6 text-zinc-400 shrink-0" />}
          <div>
            <p className="text-sm font-semibold">{active ? "యాక్టివ్ సభ్యుడు" : "ఇనాక్టివ్"}</p>
            <p className="text-xs text-white/60">
              {m.joined_date ? `చేరిన తేదీ: ${new Date(m.joined_date).toLocaleDateString("te-IN")}` : "—"}
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/40">
          ఈ పేజీ ID card verification కోసం మాత్రమే. Personal details private గా ఉంచబడతాయి.
        </p>
      </div>
    </div>
  );
}
