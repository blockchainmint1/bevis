/**
 * Scheduled house-wallet check. Call hourly (or however often you like) with
 *   Authorization: Bearer <LOVABLE_CRON_SECRET>
 * and it alerts on Telegram when the house wallet falls below the floor.
 */

import { createFileRoute } from "@tanstack/react-router";

async function run(request: Request): Promise<Response> {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : new URL(request.url).searchParams.get("key") ?? "";
  if (!secret || token !== secret) return new Response("Unauthorized", { status: 401 });

  try {
    const { checkHouseWallet } = await import("@/lib/bevis/houseAlert.server");
    return Response.json(await checkHouseWallet(false));
  } catch (e) {
    console.error("house-balance cron failed:", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/cron/house-balance")({
  server: { handlers: { GET: ({ request }) => run(request), POST: ({ request }) => run(request) } },
});
