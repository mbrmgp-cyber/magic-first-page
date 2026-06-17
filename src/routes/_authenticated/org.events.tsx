import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "@/components/SectionShell";

export const Route = createFileRoute("/_authenticated/org/events")({
  head: () => ({ meta: [{ title: "Events" }] }),
  component: () => <SectionShell title="కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు" />,
});
