import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { postTargetSchema, postReasonSchema } from "./varadhi-moderation";
import { z } from "zod";

export const getPostModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).inputValidator(d => postTargetSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("varadhi_moderate_post", { _type: data.target_type, _id: data.target_id, _action: "check" });
    if (error) throw new Error(error.message);
    const { data: removal, error: readError } = await context.supabase.from("varadhi_post_removals")
      .select("reason,actor_name,created_at").eq("target_type", data.target_type).eq("target_id", data.target_id).maybeSingle();
    if (readError) throw new Error(readError.message);
    const status = result as { canRemove: boolean; removed: boolean; reported: boolean };
    return { ...status, removal };
  });

export const reportVaradhiPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(d => postReasonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("varadhi_moderate_post", { _type: data.target_type, _id: data.target_id, _action: "report", _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewVaradhiPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(d => postReasonSchema.extend({ action: z.enum(["remove", "dismiss"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("varadhi_moderate_post", { _type: data.target_type, _id: data.target_id, _action: data.action, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPostModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS applies each active regional seat; owners can read removal explanations,
    // reporters their own reports. No privileged client or caller-supplied role.
    const [reports, removals] = await Promise.all([
      context.supabase.from("varadhi_post_reports").select("id,target_type,target_id,title,reason,status,review_reason,reviewer_name,created_at").order("created_at", { ascending: false }).limit(200),
      context.supabase.from("varadhi_post_removals").select("id,target_type,target_id,title,reason,actor_name,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (reports.error || removals.error) throw new Error(reports.error?.message ?? removals.error?.message);
    return { reports: reports.data ?? [], removals: removals.data ?? [] };
  });