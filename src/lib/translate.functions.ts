import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { translateBatchImpl } from "./translate-batch.server";

/** Signed-out visitors get cached translations only; new AI translations need a signed-in user. */
async function isSignedIn(): Promise<boolean> {
  const auth = getRequest()?.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (!token) return false;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  return !error && !!data?.claims?.sub;
}

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lang: z.enum(["te", "hi", "en", "ta", "kn"]),
        texts: z.array(z.string().min(1).max(400)).max(40),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const signedIn = await isSignedIn().catch(() => false);
    return translateBatchImpl(data.lang, data.texts, !signedIn);
  });
