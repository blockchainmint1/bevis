/**
 * Notarisation fuel.
 *
 * Every stamp on the TEXITcoin chain costs a little TXC, and the person
 * making the record pays for it. Each account — and each signed-out device —
 * gets its own deposit address derived from our seed; they fund it, we spend
 * only their coins on their anchors. No custody ledger, no balances table:
 * the chain is the balance.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FuelStatus =
  | {
      ok: true;
      address: string;
      balanceTxc: number;
      anchorsRemaining: number;
      costPerAnchorTxc: number;
      serviceFeeTxc: number;
      serviceFeeUsd: number;
      funded: boolean;
    }
  | { ok: false; error: string };

async function readFuel(ownerKey: string): Promise<FuelStatus> {
  try {
    const { hasFuel, anchorCostTxc, serviceFeeTxc, SERVICE_FEE_USD } = await import(
      "@/lib/bevis/txc.server"
    );
    const status = await hasFuel(ownerKey);
    return {
      ok: true as const,
      address: status.address,
      balanceTxc: status.balanceTxc,
      anchorsRemaining: status.anchorsRemaining,
      costPerAnchorTxc: await anchorCostTxc(),
      serviceFeeTxc: await serviceFeeTxc(),
      serviceFeeUsd: SERVICE_FEE_USD,
      funded: status.funded,
    };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message || "Fuel wallet unavailable." };
  }
}

/** The signed-in account's own fuel address and runway. */
export const getMyFuel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readFuel(`user:${context.userId}`));

/** A signed-out device's own fuel address and runway. */
export const getDeviceFuel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ deviceId: z.string().min(8).max(100) }).parse(d))
  .handler(async ({ data }) => readFuel(`device:${data.deviceId}`));
