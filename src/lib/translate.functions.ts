import { createServerFn } from "@tanstack/react-start";
import { translationInputSchema } from "./language-support";
import { translateBatchImpl } from "./translate-batch.server";

/** DOM sweeps only read reviewed/shared translations; page views must not start AI jobs. */
export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((d) => translationInputSchema.parse(d))
  .handler(({ data }) => translateBatchImpl(data.lang, data.texts, true));
