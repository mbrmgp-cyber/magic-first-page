import { createFileRoute } from "@tanstack/react-router";
import { Route as MemberRegisterRoute } from "./member.register";

// Public alias for /member/register. Render the same component directly
// (no redirect) so unauthenticated users land on the form immediately.
export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Member Registration — MBR App" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  component: MemberRegisterRoute.options.component!,
});
