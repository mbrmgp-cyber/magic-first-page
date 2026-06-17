import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "@/components/SectionShell";

export const Route = createFileRoute("/_authenticated/org/accounts")({
  head: () => ({ meta: [{ title: "Accounts" }] }),
  component: () => <SectionShell title="అకౌంట్స్" />,
});
