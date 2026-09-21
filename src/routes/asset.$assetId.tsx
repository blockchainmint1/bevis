import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/asset/$assetId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/asset/$assetId", params, replace: true });
  },
});
