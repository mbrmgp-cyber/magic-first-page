import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "./org.rules";

export const Route = createFileRoute("/_authenticated/org/accounts")({
  head: () => ({ meta: [{ title: "Accounts" }] }),
  component: () => <SectionShell title="అకౌంట్స్" />,
});
