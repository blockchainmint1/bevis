/**
 * Card top-ups for notarisation fuel.
 *
 * The buyer pays in dollars; once the payment settles we move the equivalent
 * TEXITcoin from the house wallet into *their* own fuel address. Signed-out
 * devices can buy too — the device's fuel address is derived the same way.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const OWNER_KEY = /^(user|device):[A-Za-z0-9_-]{8,100}$/;

export type CheckoutResult = { clientSecret: string } | { error: string };

export const createFuelCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        ownerKey: z.string().regex(OWNER_KEY),
        customerEmail: z.string().email().optional(),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "That top-up amount is not available." };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        automatic_tax: { enabled: true },
        payment_intent_data: { description: "BEVIS notarisation fuel" },
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        metadata: {
          kind: "fuel_topup",
          ownerKey: data.ownerKey,
          managed_payments: "false",
          ...(data.ownerKey.startsWith("user:") && { userId: data.ownerKey.slice(5) }),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type TopupStatus =
  | { found: true; status: string; txcAmount: number | null; txid: string | null; error: string | null }
  | { found: false };

/** Poll after checkout: has the webhook credited the fuel yet? */
export const getTopupStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ sessionId: z.string().min(8).max(200) }).parse(data))
  .handler(async ({ data }): Promise<TopupStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("fuel_topups")
      .select("status, txc_amount, txid, error")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!row) return { found: false };
    return {
      found: true,
      status: row.status,
      txcAmount: row.txc_amount === null ? null : Number(row.txc_amount),
      txid: row.txid,
      error: row.error,
    };
  });
