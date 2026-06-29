import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/member/register",
      search: search.code ? { code: search.code } : {},
    });
  },
});
