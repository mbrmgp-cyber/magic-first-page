import { createFileRoute } from "@tanstack/react-router";
import { MemberRegister } from "./member.register";

// Public alias for /member/register — render the form directly so unauthenticated
// users land on it without any redirect, splash, or auth checks.
export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join a Society with a Code — MBR App Registration" },
      {
        name: "description",
        content:
          "Quick registration link for MBR App: enter or scan your society code and submit your membership details for approval.",
      },
      { property: "og:title", content: "Join a Society with a Code — MBR App Registration" },
      {
        property: "og:description",
        content: "Enter or scan your society code and submit your MBR App membership details for approval.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mbrplatform.com/register" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mbrplatform.com/register" }],
  }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { code?: string } => {
    const code = typeof s.code === "string" && s.code ? s.code : undefined;
    return code ? { code } : {};
  },
  component: function RegisterPage() {
    const search = Route.useSearch();
    return <MemberRegister initialCode={search.code} />;
  },
});
