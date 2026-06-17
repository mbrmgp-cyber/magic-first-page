import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "./org.rules";

export const Route = createFileRoute("/_authenticated/org/members")({
  head: () => ({ meta: [{ title: "Members" }] }),
  component: () => <SectionShell title="సభ్యుల వివరాలు & నమోదు" />,
});
