import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Save, Trash2, User, Award, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  ADMIN_MODULES,
  listOrgAdminAccess,
  setAdminAccess,
  revokeAdminAccess,
  type AdminModuleKey,
} from "@/lib/admin-permissions.functions";
import { committeeRoleLabel } from "@/lib/committee-roles";

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
  const [draft, setDraft] = useState<Record<string, { modules: Set<AdminModuleKey> }>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);
  // Only one committee member's permission details are open at a time.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data?.rows) return;
    const next: typeof draft = {};
    for (const r of q.data.rows) {
      if (!r.user_id) continue;
      next[r.user_id] = {
        modules: new Set(r.modules as AdminModuleKey[]),
      };
    }
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.rows?.length]);

  const rows = q.data?.rows ?? [];

  const toggle = (uid: string, key: AdminModuleKey) => {
    setDraft((d) => {
      const cur = d[uid] ?? { modules: new Set<AdminModuleKey>() };
      const s = new Set(cur.modules);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return { ...d, [uid]: { modules: s } };
    });
  };

  const saveRow = async (uid: string) => {
    const cur = draft[uid];
    if (!cur) return;
    setSavingUser(uid);
    try {
      await save({ data: { user_id: uid, modules: Array.from(cur.modules), preset: "custom" } });
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
      setDraft((d) => ({ ...d, [uid]: { modules: new Set() } }));
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
              "Tap a committee member's name to see their position, qualifications and access, then tick only the sections that person may open and press Save.",
              "కమిటీ సభ్యుని పేరు నొక్కితే వారి పదవి, అర్హత, అనుమతులు కనపడతాయి. ఆ వ్యక్తి తెరవాల్సిన భాగాలను మాత్రమే టిక్ చేసి సేవ్ చేయండి."
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
          const isOpen = openId === r.committee_id;
          const onToggleOpen = () => setOpenId(isOpen ? null : r.committee_id);
          if (!uid) {
            return (
              <Card key={r.committee_id} className="bg-zinc-950 border-white/10 overflow-hidden">
                <PersonHeader
                  name={r.name}
                  photoUrl={r.photo_url}
                  role={committeeRoleLabel(r.committee_role, lang === "te" ? "te" : "en")}
                  open={isOpen}
                  onClick={onToggleOpen}
                  badge={lt("No login", "లాగిన్ లేదు")}
                />
                {isOpen && (
                  <p className="px-3 pb-3 text-xs text-amber-200">
                    {lt("No login yet; ask them to sign in once before granting access.", "ఇంకా లాగిన్ చేయలేదు; అనుమతి ఇచ్చేముందు ఒకసారి లాగిన్ చేయమని అడగండి.")}
                  </p>
                )}
              </Card>
            );
          }
          const cur = draft[uid] ?? { modules: new Set<AdminModuleKey>() };
          const count = cur.modules.size;
          return (
            <PersonCard
              key={r.committee_id}
              open={isOpen}
              onToggleOpen={onToggleOpen}
              name={r.name}
              email={r.email}
              photoUrl={r.photo_url}
              role={committeeRoleLabel(r.committee_role, lang === "te" ? "te" : "en")}
              qualifications={r.qualifications ?? null}
              modules={cur.modules}
              count={count}
              saving={savingUser === uid}
              onToggle={(k) => toggle(uid, k)}
              onSave={() => saveRow(uid)}
              onRevoke={() => revokeRow(uid)}
              lang={lang === "te" ? "te" : "en"}
            />
          );
        })}
      </div>
    </div>
  );
}

function PersonHeader(props: {
  name: string;
  photoUrl: string | null;
  role: string;
  open: boolean;
  onClick: () => void;
  badge: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-expanded={props.open}
      className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition"
    >
      {props.photoUrl && !broken ? (
        <img
          src={props.photoUrl}
          alt={props.name}
          onError={() => setBroken(true)}
          className="w-12 h-12 rounded-full object-cover border border-white/15 shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-white/60" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white leading-tight break-words">{props.name}</p>
        {props.role && <p className="text-xs text-[#ff8c28] mt-0.5">{props.role}</p>}
      </div>
      <span className="text-xs text-white/60 shrink-0">{props.badge}</span>
      <ChevronDown className={`w-5 h-5 text-white/60 shrink-0 transition-transform ${props.open ? "rotate-180" : ""}`} />
    </button>
  );
}

function PersonCard(props: {
  open: boolean;
  onToggleOpen: () => void;
  name: string;
  email: string;
  photoUrl: string | null;
  role: string;
  qualifications: string | null;
  modules: Set<AdminModuleKey>;
  count: number;
  saving: boolean;
  onToggle: (k: AdminModuleKey) => void;
  onSave: () => void;
  onRevoke: () => void;
  lang: "en" | "te";
}) {
  const lt = (en: string, te: string) => (props.lang === "te" ? te : en);
  const modules = useMemo(() => ADMIN_MODULES, []);
  return (
    <Card className="bg-zinc-950 border-white/10 overflow-hidden">
      <PersonHeader
        name={props.name}
        photoUrl={props.photoUrl}
        role={props.role}
        open={props.open}
        onClick={props.onToggleOpen}
        badge={`${props.count} / ${modules.length}`}
      />

      {props.open && (
      <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
      <div className="rounded-md border border-white/10 bg-white/5 p-2.5 space-y-1">
        {props.email && <p className="text-xs text-white/50 break-all">{props.email}</p>}
        <p className="text-xs text-white/60">
          {lt("Position", "పదవి")}:{" "}
          <span className="font-semibold text-[#ff8c28]">{props.role || lt("Not set", "లేదు")}</span>
        </p>
        <p className="flex items-start gap-1.5 text-xs text-white/60">
          <Award className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#ff8c28]" />
          <span>
            {lt("Qualifications", "అర్హత")}:{" "}
            <span className="text-white whitespace-pre-wrap break-words">
              {props.qualifications ?? lt("Not entered in the committee appointment", "కమిటీ నియామకంలో అర్హత నమోదు చేయలేదు")}
            </span>
          </span>
        </p>
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
      </div>
      </div>
      )}
    </Card>
  );
}
