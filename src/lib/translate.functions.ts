import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { translateBatchImpl } from "./translate-batch.server";

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        lang: z.string().min(2).max(8),
        texts: z.array(z.string().min(1).max(400)).max(60),
      })
      .parse(d)
  )
  .handler(async ({ data }) => translateBatchImpl(data.lang, data.texts));
