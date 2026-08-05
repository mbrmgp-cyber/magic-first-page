import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListAdminRequests,
  adminReviewAdminRequest,
  adminListAreaAdmins,
  adminAssignDistrictAdmin,
  adminSetAreaAdminActive,
  adminSearchVaradhiUsers,
  adminUpdateAreaSeat,
} from "@/lib/varadhi.functions";
import { STATES, districtsFor } from "@/lib/ap-locations";
import { indiaDistrictsFor } from "@/lib/india-locations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, UserPlus, Crown, MapPin, Pencil } from "lucide-react";

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export function AdminRequestsPanel({ isSuper }: { isSuper: boolean }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListAdminRequests);
  const review = useServerFn(adminReviewAdminRequest);
  const areaList = useServerFn(adminListAreaAdmins);
  const updateSeat = useServerFn(adminUpdateAreaSeat);

  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [parent, setParent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLevel, setEditLevel] = useState<"state_admin" | "district_admin">("district_admin");
  const [editDistrict, setEditDistrict] = useState("");
  const [editParent, setEditParent] = useState("");

  const q = useQuery({ queryKey: ["varadhi-admin-requests", status], queryFn: () => list({ data: { status } }) });
  const areaQ = useQuery({ queryKey: ["varadhi-area-admins"], queryFn: () => areaList() });
  const allAdmins = (areaQ.data?.admins ?? []) as any[];
  const stateAdmins = allAdmins.filter((a: any) => a.level === "state_admin" && a.is_active);
  const stateAdminsFor = (state?: string | null) =>
    stateAdmins.filter((a: any) => norm(a.state) === norm(state));
  const seatFor = (userId: string) => allAdmins.find((a: any) => a.user_id === userId) ?? null;

  function startEdit(r: any) {
    const seat = seatFor(r.user_id);
    setEditing(r.id);
    setEditLevel((seat?.level ?? r.requested_level ?? "district_admin") as any);
    setEditDistrict(seat?.district ?? r.district ?? "");
    setEditParent(seat?.parent_admin_id ?? "");
  }

  async function saveEdit(r: any) {
    setBusy(r.id);
    try {
      await updateSeat({
        data: {
          user_id: r.user_id,
          state: r.state,
          level: editLevel,
          district: editLevel === "district_admin" ? editDistrict : null,
          parent_admin_id: editLevel === "district_admin" ? (editParent || null) : null,
        },
      });
      toast.success("అప్‌డేట్ అయ్యింది");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["varadhi-area-admins"] });
      qc.invalidateQueries({ queryKey: ["varadhi-admin-requests"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setBusy(null);
    }
  }


  async function act(r: any, action: "approve" | "reject") {
    setBusy(r.id);
    try {
      await review({
        data: {
          request_id: r.id,
          action,
          notes: notes[r.id],
          grant_level: r.requested_level,
          parent_admin_id: r.requested_level === "district_admin" ? (parent[r.id] || null) : null,
        },
      });
      toast.success(action === "approve" ? "ఆమోదించబడింది" : "తిరస్కరించబడింది");
      qc.invalidateQueries({ queryKey: ["varadhi-admin-requests"] });
      qc.invalidateQueries({ queryKey: ["varadhi-area-admins"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setBusy(null);
    }
  }

  const rows = q.data?.requests ?? [];
  const filters: Array<{ k: typeof status; label: string }> = [
    { k: "pending", label: "పెండింగ్" },
    { k: "approved", label: "ఆమోదం" },
    { k: "rejected", label: "తిరస్కరణ" },
    { k: "all", label: "అన్నీ" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.k} size="sm" variant={status === f.k ? "default" : "outline"} onClick={() => setStatus(f.k)}>
            {f.label}
          </Button>
        ))}
      </div>

      {!isSuper && (
        <p className="text-[11px] text-muted-foreground">మీ రాష్ట్రానికి వచ్చిన దరఖాస్తులు మాత్రమే — ఆమోదం సూపర్ అడ్మిన్ మాత్రమే చేయగలరు.</p>
      )}

      {q.isLoading ? (
        <p className="text-center text-sm py-8">లోడ్…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">దరఖాస్తులు లేవు.</Card>
      ) : (
        rows.map((r: any) => (
          <Card key={r.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 gap-3">
                {r.photo_signed_url ? (
                  <img src={r.photo_signed_url} alt={r.full_name} className="h-14 w-14 shrink-0 rounded-full border object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-full border bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.requested_level === "state_admin" ? "రాష్ట్ర అడ్మిన్" : "జిల్లా అడ్మిన్"} · {r.state}
                    {r.district ? ` / ${r.district}` : ""}
                  </p>
                  {r.phone && <p className="text-xs text-muted-foreground">📞 {r.phone}</p>}
                  {r.email && <p className="text-xs text-muted-foreground">✉️ {r.email}</p>}
                  {r.aadhaar_signed_url && (
                    <a href={r.aadhaar_signed_url} target="_blank" rel="noreferrer"
                      className="text-xs underline text-[#1e3a8a] inline-flex items-center gap-1">
                      ఆధార్ కార్డు చూడండి
                    </a>
                  )}
                  {r.message && <p className="text-xs mt-1">{r.message}</p>}
                </div>
              </div>
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                {r.status}
              </Badge>
            </div>


            {isSuper && r.status === "pending" && (
              <div className="space-y-2">
                {r.requested_level === "district_admin" && (
                  <select
                    className="w-full h-9 rounded-md border bg-background px-2 text-xs"
                    value={parent[r.id] ?? ""}
                    onChange={(e) => setParent((p) => ({ ...p, [r.id]: e.target.value }))}
                  >
                    <option value="">ఏ రాష్ట్ర అడ్మిన్ కింద? (ఐచ్ఛికం)</option>
                    {stateAdmins.filter((a: any) => a.state === r.state).map((a: any) => (
                      <option key={a.id} value={a.id}>{a.profile?.full_name ?? a.user_id.slice(0, 8)} · {a.state}</option>
                    ))}
                  </select>
                )}
                <Input
                  className="h-9 text-xs"
                  placeholder="గమనిక (ఐచ్ఛికం)"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy === r.id} onClick={() => act(r, "approve")}>
                    <Check className="h-4 w-4 mr-1" /> ఆమోదించు
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r, "reject")}>
                    <X className="h-4 w-4 mr-1" /> తిరస్కరించు
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export function AdminHierarchyPanel({ isSuper }: { isSuper: boolean }) {
  const qc = useQueryClient();
  const areaList = useServerFn(adminListAreaAdmins);
  const assign = useServerFn(adminAssignDistrictAdmin);
  const setActive = useServerFn(adminSetAreaAdminActive);
  const searchUsers = useServerFn(adminSearchVaradhiUsers);

  const areaQ = useQuery({ queryKey: ["varadhi-area-admins"], queryFn: () => areaList() });
  const admins = areaQ.data?.admins ?? [];
  const stateAdmins = admins.filter((a: any) => a.level === "state_admin");
  const districtAdmins = admins.filter((a: any) => a.level === "district_admin");

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);

  const parentSeat = stateAdmins.find((a: any) => a.id === openFor) ?? null;
  const usersQ = useQuery({
    queryKey: ["varadhi-user-search", parentSeat?.state ?? "", term],
    queryFn: () => searchUsers({ data: { q: term || undefined, state: parentSeat?.state } }),
    enabled: !!parentSeat,
  });

  async function doAssign(userId: string) {
    if (!parentSeat || !district) { toast.error("జిల్లా ఎంచుకోండి"); return; }
    setBusy(true);
    try {
      await assign({ data: { user_id: userId, state: parentSeat.state, district, parent_admin_id: parentSeat.id } });
      toast.success("జిల్లా అడ్మిన్ కేటాయించబడ్డారు");
      setOpenFor(null); setDistrict(""); setTerm("");
      qc.invalidateQueries({ queryKey: ["varadhi-area-admins"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, is_active: boolean) {
    try {
      await setActive({ data: { id, is_active } });
      qc.invalidateQueries({ queryKey: ["varadhi-area-admins"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    }
  }

  if (areaQ.isLoading) return <p className="text-center text-sm py-8">లోడ్…</p>;

  return (
    <div className="space-y-4">
      {stateAdmins.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">ఇంకా రాష్ట్ర అడ్మిన్లు లేరు.</Card>
      )}

      {stateAdmins.map((s: any) => {
        const kids = districtAdmins.filter((d: any) => d.parent_admin_id === s.id || (!d.parent_admin_id && d.state === s.state));
        return (
          <Card key={s.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold flex items-center gap-1">
                  <Crown className="h-4 w-4 text-[#f97316]" />
                  {s.profile?.full_name ?? s.user_id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground">రాష్ట్ర అడ్మిన్ · {s.state}</p>
                {s.profile?.phone && <p className="text-xs text-muted-foreground">📞 {s.profile.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "యాక్టివ్" : "నిలిపివేయబడింది"}</Badge>
                {isSuper && (
                  <Button size="sm" variant="outline" onClick={() => toggle(s.id, !s.is_active)}>
                    {s.is_active ? "నిలిపివేయి" : "తిరిగి యాక్టివ్"}
                  </Button>
                )}
              </div>
            </div>

            <div className="pl-3 border-l-2 border-[#1e3a8a]/15 space-y-2">
              {kids.length === 0 && <p className="text-xs text-muted-foreground">జిల్లా అడ్మిన్లు లేరు.</p>}
              {kids.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.profile?.full_name ?? d.user_id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {d.district}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.is_active ? "outline" : "secondary"} className="text-[10px]">
                      {d.is_active ? "యాక్టివ్" : "నిలిపివేత"}
                    </Badge>
                    {isSuper && (
                      <Button size="sm" variant="ghost" onClick={() => toggle(d.id, !d.is_active)}>
                        {d.is_active ? "తీసివేయి" : "యాక్టివ్"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {isSuper && (
                openFor === s.id ? (
                  <div className="space-y-2 pt-2">
                    <select
                      className="w-full h-9 rounded-md border bg-background px-2 text-xs"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    >
                      <option value="">జిల్లా ఎంచుకోండి</option>
                      {districtsFor(s.state).map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <Input className="h-9 text-xs" placeholder="పేరు / ఫోన్ వెతకండి" value={term} onChange={(e) => setTerm(e.target.value)} />
                    <div className="max-h-52 overflow-auto space-y-1">
                      {(usersQ.data?.users ?? []).map((u: any) => (
                        <button
                          key={u.user_id}
                          disabled={busy}
                          onClick={() => doAssign(u.user_id)}
                          className="w-full text-left px-2 py-1.5 rounded-md border hover:bg-muted text-xs"
                        >
                          <span className="font-medium">{u.full_name}</span>
                          <span className="text-muted-foreground"> · {[u.district, u.mandal].filter(Boolean).join(", ")}</span>
                        </button>
                      ))}
                      {(usersQ.data?.users ?? []).length === 0 && (
                        <p className="text-[11px] text-muted-foreground">వినియోగదారులు కనిపించలేదు.</p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setOpenFor(null); setDistrict(""); setTerm(""); }}>రద్దు</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setOpenFor(s.id)}>
                    <UserPlus className="h-4 w-4 mr-1" /> జిల్లా అడ్మిన్‌ను కేటాయించండి
                  </Button>
                )
              )}
            </div>
          </Card>
        );
      })}

      {!isSuper && (
        <p className="text-[11px] text-muted-foreground">కేటాయింపులు సూపర్ అడ్మిన్ మాత్రమే చేయగలరు.</p>
      )}

      {STATES.length === 0 && null}
    </div>
  );
}
