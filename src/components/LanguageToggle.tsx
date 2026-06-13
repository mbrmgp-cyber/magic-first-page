import { useI18n, type Lang } from "@/lib/i18n";
import { Globe } from "lucide-react";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "te", label: "తెలుగు" },
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 backdrop-blur px-1 py-1 ${className}`}>
      <Globe className="h-4 w-4 text-white/70 ml-2" />
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
            lang === o.code
              ? "bg-[#ff8c28] text-black font-semibold"
              : "text-white/80 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
