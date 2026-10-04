import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account-deletion.functions";

export function DeleteAccountButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const del = useServerFn(deleteMyAccount);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!window.confirm("Delete your account permanently? / మీ ఖాతాను శాశ్వతంగా తొలగించాలా?\n\nThis cannot be undone.")) return;
    const typed = window.prompt('Type DELETE to confirm');
    if (typed !== "DELETE") return;
    setBusy(true);
    try {
      await del();
      await supabase.auth.signOut();
      alert("Your account has been deleted.");
      navigate({ to: redirectTo });
    } catch (e: any) {
      alert(e?.message || "Could not delete account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-2 rounded-xl border border-destructive/40 bg-background px-4 py-3 text-sm font-semibold text-destructive disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" /> {busy ? "Deleting…" : "Delete my account / ఖాతా తొలగించండి"}
    </button>
  );
}
