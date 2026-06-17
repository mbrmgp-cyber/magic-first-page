import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "@/components/SectionShell";

export const Route = createFileRoute("/_authenticated/org/designs")({
  head: () => ({ meta: [{ title: "Designs" }] }),
  component: () => <SectionShell title="ID కార్డులు, మెమెంటోలు, లెటర్‌ప్యాడ్, స్టాంప్ డిజైన్" />,
});
