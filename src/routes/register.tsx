import { createFileRoute } from "@tanstack/react-router";
import { MemberRegister } from "./member.register";

// Public alias for /member/register — render the form directly so unauthenticated
// users land on it without any redirect, splash, or auth checks.
export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Member Registration — MBR App" }] }),
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
