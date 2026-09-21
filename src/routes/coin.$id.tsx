import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/coin/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/coin/$id", params, replace: true });
  },
});
