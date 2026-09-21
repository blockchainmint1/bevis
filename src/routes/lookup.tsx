import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lookup")({
  beforeLoad: () => {
    throw redirect({ to: "/app/lookup", replace: true });
  },
});
