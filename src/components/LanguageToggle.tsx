import { useI18n, type Lang } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { code: Lang; label: string; short: string }[] = [
  { code: "te", label: "తెలుగు", short: "తె" },
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिंदी", short: "हि" },
];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 backdrop-blur px-3 py-1.5 text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer ${className}`}
      >
        <Globe className="h-4 w-4 text-[#ff8c28]" />
        <span className="font-medium">{t("language")}</span>
        <span className="text-white/60">· {current.short}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.code}
            onClick={() => setLang(o.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span>{o.label}</span>
            {lang === o.code && <Check className="h-4 w-4 text-[#ff8c28]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
