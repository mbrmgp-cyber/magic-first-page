import { useI18n } from "@/lib/i18n";
import type { OrganizationForm } from "@/lib/admin-organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Props = {
  value: OrganizationForm;
  onChange?: (value: OrganizationForm) => void;
  document: (path: string) => ReactNode;
  disabled?: boolean;
};

export function OrganizationRegistrationDetails({ value, onChange, document, disabled }: Props) {
  const { lang } = useI18n();
  const L = (en: string, te: string, hi: string) => lang === "te" ? te : lang === "hi" ? hi : en;
  const fields: [keyof OrganizationForm, string][] = [
    ["name", L("Name", "సంస్థ పేరు", "संस्था का नाम")],
    ["email", L("Email", "ఈమెయిల్", "ईमेल")],
    ["phone", L("Phone", "ఫోన్", "फ़ोन")],
    ["slogan", L("Slogan", "నినాదం", "नारा")],
    ["address", L("Address", "చిరునామా", "पता")],
    ["gov_reg_number", L("Government registration number", "ప్రభుత్వ రిజిస్ట్రేషన్ నంబర్", "सरकारी पंजीकरण संख्या")],
    ["bank_account_holder", L("Account holder", "ఖాతాదారు పేరు", "खाताधारक")],
    ["bank_account_number", L("Bank account number", "బ్యాంకు ఖాతా నంబర్", "बैंक खाता संख्या")],
    ["bank_name", L("Bank name", "బ్యాంకు పేరు", "बैंक का नाम")],
    ["bank_branch", L("Bank branch", "బ్యాంకు శాఖ", "बैंक शाखा")],
    ["bank_ifsc", L("IFSC", "ఐఎఫ్‌ఎస్‌సీ", "आईएफएससी")],
    ["admin_name", L("Registered admin name", "నమోదు చేసిన అడ్మిన్ పేరు", "पंजीकृत व्यवस्थापक का नाम")],
    ["admin_designation", L("Admin designation", "అడ్మిన్ హోదా", "व्यवस्थापक का पद")],
  ];
  const documents: ["logo_url" | "registration_certificate_url" | "pan_card_url" | "admin_aadhaar_url", string][] = [
    ["logo_url", L("Logo", "లోగో", "लोगो")],
    ["registration_certificate_url", L("Registration certificate", "రిజిస్ట్రేషన్ ధృవపత్రం", "पंजीकरण प्रमाणपत्र")],
    ["pan_card_url", L("PAN card", "పాన్ కార్డు", "पैन कार्ड")],
    ["admin_aadhaar_url", L("Admin Aadhaar", "అడ్మిన్ ఆధార్", "व्यवस्थापक का आधार")],
  ];
  function fileControl(label: string, path: string, update?: (path: string) => void) {
    return <div className="space-y-2 min-w-0">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {path ? (path.startsWith("data:image/") ? <img src={path} alt={label} className="h-16 w-16 object-contain rounded border border-border" /> : document(path)) : <span className="text-sm text-muted-foreground">—</span>}
        {update && <>
          <Label className="cursor-pointer inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm">
            <Upload className="h-4 w-4" />{L("Upload", "అప్‌లోడ్", "अपलोड")}
            <input type="file" aria-label={label} accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={disabled} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 3 * 1024 * 1024) { toast.error(L("Image must be under 3MB", "చిత్రం 3MB లోపు ఉండాలి", "छवि 3MB से कम होनी चाहिए")); return; }
              const reader = new FileReader();
              reader.onload = () => { if (typeof reader.result === "string") update(reader.result); };
              reader.readAsDataURL(file);
              e.target.value = "";
            }} />
          </Label>
          {path && <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`${L("Remove", "తొలగించు", "हटाएँ")} ${label}`} onClick={() => update("")}><Trash2 className="h-4 w-4" /></Button>}
        </>}
      </div>
    </div>;
  }
  const founders = value.founders ?? [];
  return <div className="space-y-5 text-foreground" data-no-translate>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map(([key, label]) => <div key={key} className="min-w-0 space-y-1">
        <Label htmlFor={`org-${key}`}>{label}</Label>
        {onChange ? (key === "address" || key === "slogan" ? <Textarea id={`org-${key}`} value={String(value[key] ?? "")} disabled={disabled} onChange={(e) => onChange({ ...value, [key]: e.target.value })} /> : <Input id={`org-${key}`} type={key === "email" ? "email" : "text"} value={String(value[key] ?? "")} disabled={disabled} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />) : <p className="text-sm whitespace-pre-wrap break-words">{String(value[key] || "—")}</p>}
      </div>)}
    </div>
    <div className="flex items-center gap-2">
      {onChange && <Checkbox id="org-is-gov" checked={value.is_gov_registered ?? true} disabled={disabled} onCheckedChange={(checked) => onChange({ ...value, is_gov_registered: checked === true })} />}
      <Label htmlFor="org-is-gov">{L("Government registered", "ప్రభుత్వ నమోదు", "सरकारी पंजीकरण")}{!onChange && `: ${value.is_gov_registered ? L("Yes", "అవును", "हाँ") : L("No", "కాదు", "नहीं")}`}</Label>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
      {documents.map(([key, label]) => <div key={key}>{fileControl(label, value[key] ?? "", onChange ? (path) => onChange({ ...value, [key]: path }) : undefined)}</div>)}
    </div>
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{L("Founders", "వ్యవస్థాపకులు", "संस्थापक")} ({founders.length})</h3>
        {onChange && <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...value, founders: [...founders, { name: "", address: "", aadhaar_url: "" }] })}><Plus className="h-4 w-4 mr-1" />{L("Add founder", "వ్యవస్థాపకుడిని చేర్చు", "संस्थापक जोड़ें")}</Button>}
      </div>
      {founders.length === 0 && <p className="text-sm text-muted-foreground">{L("No founders recorded", "వ్యవస్థాపకుల వివరాలు నమోదు కాలేదు", "संस्थापकों का विवरण दर्ज नहीं है")}</p>}
      {founders.map((founder, index) => <div key={index} className="space-y-2 border-b border-border pb-4">
        <div className="flex items-center justify-between"><span className="text-sm font-medium">{index + 1}</span>{onChange && <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`${L("Remove founder", "వ్యవస్థాపకుడిని తొలగించు", "संस्थापक हटाएँ")} ${index + 1}`} onClick={() => onChange({ ...value, founders: founders.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>}</div>
        {onChange ? <>
          <Label htmlFor={`founder-name-${index}`}>{L("Founder name", "వ్యవస్థాపకుడి పేరు", "संस्थापक का नाम")}</Label>
          <Input id={`founder-name-${index}`} value={founder.name} disabled={disabled} onChange={(e) => onChange({ ...value, founders: founders.map((f, i) => i === index ? { ...f, name: e.target.value } : f) })} />
          <Label htmlFor={`founder-address-${index}`}>{L("Founder address", "వ్యవస్థాపకుడి చిరునామా", "संस्थापक का पता")}</Label>
          <Textarea id={`founder-address-${index}`} value={founder.address ?? ""} disabled={disabled} onChange={(e) => onChange({ ...value, founders: founders.map((f, i) => i === index ? { ...f, address: e.target.value } : f) })} />
        </> : <><p className="font-medium break-words">{founder.name}</p><p className="text-sm whitespace-pre-wrap break-words">{founder.address || "—"}</p></>}
        {fileControl(L("Aadhaar card", "ఆధార్ కార్డు", "आधार कार्ड"), founder.aadhaar_url ?? "", onChange ? (path) => onChange({ ...value, founders: founders.map((f, i) => i === index ? { ...f, aadhaar_url: path } : f) }) : undefined)}
      </div>)}
    </section>
  </div>;
}