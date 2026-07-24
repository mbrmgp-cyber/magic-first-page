import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Save, RotateCcw, Trash2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  ADMIN_MODULES,
  PRESET_MODULES,
  listOrgAdminAccess,
  setAdminAccess,
  revokeAdminAccess,
  type AdminModuleKey,
  type AdminPreset,
} from "@/lib/admin-permissions.functions";

export const Route = createFileRoute("/_authenticated/org/admin-access")({
  head: () => ({
    meta: [
      { title: "Admin Access — MBR App" },
      { name: "description", content: "Super Admin controls granular module-level permissions for each committee member." },
    ],
  }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { lang } = useI18n();
  const lt = (en: string, te: string) => (lang === "te" ? te : en);

  const fetchList = useServerFn(listOrgAdminAccess);
  const q = useQuery({ queryKey: ["admin-access-list"], queryFn: () => fetchList() });
  const save = useServerFn(setAdminAccess);
  const revoke = useServerFn(revokeAdminAccess);

  // Local editable state keyed by user_id.
  const [draft, setDraft] = useState<Record<string, { modules: Set<AdminModuleKey>; preset: AdminPreset }>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data?.rows) return;
    const next: typeof draft = {};
    for (const r of q.data.rows) {
      if (!r.user_id) continue;
      next[r.user_id] = {
        modules: new Set(r.modules as AdminModuleKey[]),
        preset: (r.preset as AdminPreset) ?? "custom",
      };
    }
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.rows?.length]);

  const rows = q.data?.rows ?? [];

  const applyPreset = (uid: string, preset: Exclude<AdminPreset, "custom">) => {
    setDraft((d) => ({
      ...d,
      [uid]: { modules: new Set(PRESET_MODULES[preset]), preset },
    }));
  };

  const toggle = (uid: string, key: AdminModuleKey) => {
    setDraft((d) => {
      const cur = d[uid] ?? { modules: new Set<AdminModuleKey>(), preset: "custom" as AdminPreset };
      const s = new Set(cur.modules);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return { ...d, [uid]: { modules: s, preset: "custom" } };
    });
  };

  const saveRow = async (uid: string) => {
    const cur = draft[uid];
    if (!cur) return;
    setSavingUser(uid);
    try {
      await save({ data: { user_id: uid, modules: Array.from(cur.modules), preset: cur.preset } });
      toast.success(lt("Access saved", "అనుమతులు సేవ్ అయ్యాయి"));
      await qc.invalidateQueries({ queryKey: ["admin-access-list"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingUser(null);
    }
  };

  const revokeRow = async (uid: string) => {
    setSavingUser(uid);
    try {
      await revoke({ data: { user_id: uid } });
      toast.success(lt("Access revoked", "అనుమతులు తీసివేయబడ్డాయి"));
      setDraft((d) => ({ ...d, [uid]: { modules: new Set(), preset: "custom" } }));
      await qc.invalidateQueries({ queryKey: ["admin-access-list"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Revoke failed");
    } finally {
      setSavingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate({ to: "/org/dashboard" })}
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> {lt("Dashboard", "డాష్‌బోర్డ్")}
          </button>
          <div className="flex items-center gap-2 text-[#ff8c28]">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">{lt("Super Admin", "సూపర్ అడ్మిన్")}</span>
          </div>
        </div>

        <Card className="p-4 bg-zinc-950 border-white/10">
          <h1 className="text-lg font-bold">{lt("Admin Role & Access Management", "అడ్మిన్ పాత్రలు & అనుమతులు")}</h1>
          <p className="text-xs text-white/60 mt-1">
            {lt(
              "Assign module-level permissions to each committee member. President and Treasurer presets are pre-filled but you can adjust any checkbox per person.",
              "ప్రతి కమిటీ సభ్యునికి మాడ్యూల్-స్థాయి అనుమతులు కేటాయించండి. అధ్యక్షుడు మరియు కోశాధికారి ప్రీసెట్‌లు ముందుగా నింపబడతాయి, కానీ ప్రతి వ్యక్తికి ఏ చెక్‌బాక్స్‌ను అయినా మార్చవచ్చు."
            )}
          </p>
        </Card>

        {q.isLoading && <Card className="p-6 text-center text-white/60 bg-zinc-950 border-white/10">Loading…</Card>}

        {!q.isLoading && rows.length === 0 && (
          <Card className="p-6 text-center bg-zinc-950 border-white/10 space-y-2">
            <p className="text-white/70 text-sm">
              {lt("No committee members yet.", "కమిటీ సభ్యులు లేరు.")}
            </p>
            <Link to="/org/committee">
              <Button className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
                {lt("Appoint Committee", "కమిటీ నియమించండి")}
              </Button>
            </Link>
          </Card>
        )}

        {rows.map((r: any) => {
          const uid = r.user_id as string | null;
          if (!uid) {
            return (
              <Card key={r.committee_id} className="p-3 bg-zinc-950 border-white/10 text-xs text-amber-200">
                {r.name} — {lt("no login yet; ask them to sign in once before granting access.", "ఇంకా లాగిన్ చేయలేదు; అనుమతి ఇచ్చేముందు ఒకసారి లాగిన్ చేయమని అడగండి.")}
              </Card>
            );
          }
          const cur = draft[uid] ?? { modules: new Set<AdminModuleKey>(), preset: "custom" as AdminPreset };
          const count = cur.modules.size;
          const isPres = r.committee_role === "president";
          const isTreas = r.committee_role === "treasurer";
          return (
            <PersonCard
              key={r.committee_id}
              name={r.name}
              email={r.email}
              photoUrl={r.photo_url}
              role={r.committee_role}
              preset={cur.preset}
              modules={cur.modules}
              count={count}
              saving={savingUser === uid}
              onToggle={(k) => toggle(uid, k)}
              onPresetPresident={() => applyPreset(uid, "president")}
              onPresetTreasurer={() => applyPreset(uid, "treasurer")}
              onSave={() => saveRow(uid)}
              onRevoke={() => revokeRow(uid)}
              lang={lang}
              highlightPresident={isPres}
              highlightTreasurer={isTreas}
            />
          );
        })}
      </div>
    </div>
  );
}

function PersonCard(props: {
  name: string;
  email: string;
  photoUrl: string | null;
  role: string;
  preset: AdminPreset;
  modules: Set<AdminModuleKey>;
  count: number;
  saving: boolean;
  onToggle: (k: AdminModuleKey) => void;
  onPresetPresident: () => void;
  onPresetTreasurer: () => void;
  onSave: () => void;
  onRevoke: () => void;
  lang: "en" | "te";
  highlightPresident: boolean;
  highlightTreasurer: boolean;
}) {
  const lt = (en: string, te: string) => (props.lang === "te" ? te : en);
  const modules = useMemo(() => ADMIN_MODULES, []);
  return (
    <Card className="p-4 bg-zinc-950 border-white/10 space-y-3">
      <div className="flex items-center gap-3">
        {props.photoUrl ? (
          <img src={props.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-white/60" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{props.name}</p>
          <p className="text-xs text-white/50 truncate">{props.email} · {props.role}</p>
        </div>
        <span className="text-xs text-white/60 shrink-0">
          {props.count} / {modules.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={props.onPresetPresident}
          className={`text-xs h-8 border-white/20 bg-white/5 text-white hover:bg-white/10 ${props.highlightPresident ? "ring-1 ring-[#ff8c28]" : ""}`}
        >
          {lt("Preset: President", "ప్రీసెట్: అధ్యక్షుడు")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={props.onPresetTreasurer}
          className={`text-xs h-8 border-white/20 bg-white/5 text-white hover:bg-white/10 ${props.highlightTreasurer ? "ring-1 ring-emerald-400" : ""}`}
        >
          {lt("Preset: Treasurer", "ప్రీసెట్: కోశాధికారి")}
        </Button>
        <span className="text-[10px] uppercase tracking-wide text-white/40 self-center ml-auto">
          {props.preset === "custom" ? lt("Custom", "కస్టమ్") : props.preset === "president" ? lt("President preset", "అధ్యక్ష ప్రీసెట్") : lt("Treasurer preset", "కోశాధికారి ప్రీసెట్")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {modules.map((m) => {
          const checked = props.modules.has(m.key as AdminModuleKey);
          return (
            <label
              key={m.key}
              className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition ${
                checked ? "border-[#ff8c28]/60 bg-[#ff8c28]/5" : "border-white/10 hover:border-white/25"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => props.onToggle(m.key as AdminModuleKey)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm text-white leading-tight">{lt(m.en, m.te)}</p>
                <p className="text-[10px] text-white/40 leading-tight font-mono">{m.route}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={props.onSave}
          disabled={props.saving}
          className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white"
        >
          <Save className="w-4 h-4 mr-1" /> {lt("Save Access", "సేవ్ చేయండి")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={props.onRevoke}
          disabled={props.saving || props.count === 0}
          className="border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
        >
          <Trash2 className="w-4 h-4 mr-1" /> {lt("Revoke All", "మొత్తం తీసివేయి")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => props.onToggle("__reset__" as any) /* noop guard */}
          className="hidden"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
