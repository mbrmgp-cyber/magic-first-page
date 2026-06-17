import { createFileRoute } from "@tanstack/react-router";
import { SectionShell } from "./org.rules";

export const Route = createFileRoute("/_authenticated/org/committee")({
  head: () => ({ meta: [{ title: "Committee" }] }),
  component: () => <SectionShell title="కార్యవర్గ కమిటీ వివరాలు" />,
});
