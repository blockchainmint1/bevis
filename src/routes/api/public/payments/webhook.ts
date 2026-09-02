import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

/**
 * A fuel top-up settled. Record it (idempotently), then move the equivalent
 * TEXITcoin from the house wallet into the buyer's own fuel address.
 */
async function creditFuelTopup(session: any, env: StripeEnv) {
  const ownerKey: string | undefined = session.metadata?.ownerKey;
  if (!ownerKey) {
    console.error("fuel topup without ownerKey", session.id);
    return;
  }

  // Untyped service client: fuel_topups isn't in the generated schema types.
  const supabase = getSupabase() as any;
  const amountCents: number = session.amount_total ?? 0;

  // Unique session_id makes this idempotent across Stripe retries.
  const { error: insertError } = await supabase.from("fuel_topups").insert({
    session_id: session.id,
    owner_key: ownerKey,
    user_id: ownerKey.startsWith("user:") ? ownerKey.slice(5) : null,
    environment: env,
    amount_cents: amountCents,
    currency: session.currency ?? "usd",
    status: "pending",
  });
  if (insertError) {
    console.log("fuel topup already recorded:", session.id);
    return;
  }

  // Only real money buys real coin. Test-mode purchases stop at the record.
  if (env !== "live") {
    await supabase
      .from("fuel_topups")
      .update({ status: "test", error: "Test-mode purchase — no chain credit." })
      .eq("session_id", session.id);
    return;
  }

  const { creditFuelFromCard } = await import("@/lib/bevis/txc.server");
  const result = await creditFuelFromCard(ownerKey, amountCents / 100);

  await supabase
    .from("fuel_topups")
    .update(
      result.ok
        ? { status: "credited", address: result.address, txc_amount: result.txcAmount, txid: result.txid }
        : { status: "failed", error: result.error },
    )
    .eq("session_id", session.id);

  // Every payout drains the house wallet — warn the operator when it runs low.
  try {
    const { checkHouseWallet } = await import("@/lib/bevis/houseAlert.server");
    await checkHouseWallet(false);
  } catch (e) {
    console.error("house wallet check failed:", e);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid" && session.metadata?.kind === "fuel_topup") {
        await creditFuelTopup(session, env);
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.metadata?.kind === "fuel_topup") await creditFuelTopup(session, env);
      break;
    }
    case "checkout.session.async_payment_failed":
      console.log("Delayed payment failed:", event.data.object?.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
