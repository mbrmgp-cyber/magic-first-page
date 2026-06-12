import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrg, regenerateOrgQr, listOrgMembers, reviewMember } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Download, RefreshCw, LogOut, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/org/dashboard")({
  head: () => ({ meta: [{ title: "Org Dashboard — MBR App" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const fetchMembers = useServerFn(listOrgMembers);
  const regen = useServerFn(regenerateOrgQr);
  const review = useServerFn(reviewMember);

  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const membersQ = useQuery({ queryKey: ["org-members"], queryFn: () => fetchMembers() });

  const regenMut = useMutation({
    mutationFn: () => regen(),
    onSuccess: () => { toast.success("కొ