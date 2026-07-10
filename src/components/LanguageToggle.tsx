import { useI18n, LANG_OPTIONS } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = LANG_OPTIONS.find((o) => o.code === lang) ?? LANG_OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-black/40 backdrop-blur px-3 h-9 text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer ${className}`}
        aria-label={t("language")}
      >
        <Globe className="h-4 w-4 text-[#ff8c28]" />
        <span className="font-medium">{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        data-notranslit
        className="min-w-[12rem] max-h-[70vh] overflow-y-auto"
      >
        {LANG_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.code}
            onClick={() => setLang(o.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span data-notranslit>{o.label}</span>
            {lang === o.code && <Check className="h-4 w-4 text-[#ff8c28]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
