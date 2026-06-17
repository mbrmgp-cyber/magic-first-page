import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "@/components/SectionShell";

export const Route = createFileRoute("/_authenticated/org/members")({
  head: () => ({ meta: [{ title: "Members" }] }),
  component: () => <SectionShell title="సభ్యుల వివరాలు & నమోదు" />,
});
