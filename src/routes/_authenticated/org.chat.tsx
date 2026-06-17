import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "@/components/SectionShell";

export const Route = createFileRoute("/_authenticated/org/chat")({
  head: () => ({ meta: [{ title: "Chat" }] }),
  component: () => <SectionShell title="సభ్యులతో చాటింగ్" />,
});
