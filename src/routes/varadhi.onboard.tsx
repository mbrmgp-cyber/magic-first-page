import { createFileRoute, redirect } from "@tanstack/react-router";

// The Vaaradhi registration form now lives inside the Update Board.
// This route is kept only so old links keep working.
export const Route = createFileRoute("/varadhi/onboard")({
  beforeLoad: () => {
    throw redirect({ to: "/varadhi/dashboard", replace: true });
  },
  component: () => null,
});
