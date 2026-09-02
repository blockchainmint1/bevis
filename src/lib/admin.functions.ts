/**
 * Operator tools. Every function here is admin-only: the caller must hold the
 * `admin` role in user_roles, checked through their own authenticated client.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export type TopupRow = {
  id: string;
  sessionId: string;
  ownerKey: string;
  userId: string | null;
  email: string | null;
  environment: string;
  amountCents: number;
  currency: string;
  address: string | null;
  txcAmount: number | null;
  txid: string | null;
  status: string;
  error: string | null;
  createdAt: string;
};

export type AdminOverview = {
  house: { address: string; balanceTxc: number; threshold: number; low: boolean } | { error: string };
  txcPriceUsd: number | null;
  totals: { count: number; grossCents: number; credited: number; failed: number; pending: number };
  topups: TopupRow[];
};

/** Everything the /admin page shows: house wallet, price, top-up ledger. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: rows } = await db
      .from("fuel_topups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const list: any[] = rows ?? [];
    const userIds = [...new Set(list.map(r => r.user_id).filter(Boolean))] as string[];
    const emails = new Map<string, string>();
    for (const id of userIds.slice(0, 100)) {
      const { data } = await db.auth.admin.getUserById(id);
      if (data?.user?.email) emails.set(id, data.user.email);
    }

    let house: AdminOverview["house"];
    try {
      const { anchorWalletStatus } = await import("@/lib/bevis/txc.server");
      const s = await anchorWalletStatus(null);
      const threshold = Number(process.env["HOUSE_LOW_TXC"] ?? 1000);
      house = { address: s.address, balanceTxc: s.balanceTxc, threshold, low: s.balanceTxc < threshold };
    } catch (e) {
      house = { error: (e as Error).message };
    }

    let txcPriceUsd: number | null = null;
    try {
      const { priceUsd } = await import("@/lib/prices.server");
      txcPriceUsd = await priceUsd("txc");
    } catch {
      /* price is informational here */
    }

    return {
      house,
      txcPriceUsd,
      totals: {
        count: list.length,
        grossCents: list.reduce((n, r) => n + (r.amount_cents ?? 0), 0),
        credited: list.filter(r => r.status === "credited").length,
        failed: list.filter(r => r.status === "failed").length,
        pending: list.filter(r => r.status === "pending").length,
      },
      topups: list.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        ownerKey: r.owner_key,
        userId: r.user_id,
        email: r.user_id ? emails.get(r.user_id) ?? null : null,
        environment: r.environment,
        amountCents: r.amount_cents,
        currency: r.currency,
        address: r.address,
        txcAmount: r.txc_amount === null ? null : Number(r.txc_amount),
        txid: r.txid,
        status: r.status,
        error: r.error,
        createdAt: r.created_at,
      })),
    };
  });

/** Re-run the chain credit for a top-up that failed or stalled. */
export const retryTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; txid?: string; error?: string }> => {
    await assertAdmin(context as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: row } = await db
      .from("fuel_topups")
      .select("*")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!row) return { ok: false, error: "No such top-up." };
    if (row.status === "credited") return { ok: false, error: "Already credited." };

    const { creditFuelFromCard } = await import("@/lib/bevis/txc.server");
    const result = await creditFuelFromCard(row.owner_key, (row.amount_cents ?? 0) / 100);

    await db
      .from("fuel_topups")
      .update(
        result.ok
          ? { status: "credited", address: result.address, txc_amount: result.txcAmount, txid: result.txid, error: null }
          : { status: "failed", error: result.error },
      )
      .eq("session_id", data.sessionId);

    return result.ok ? { ok: true, txid: result.txid } : { ok: false, error: result.error };
  });

/** Fire the house-wallet check now (also sends the Telegram alert if low). */
export const testHouseAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ force: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { checkHouseWallet } = await import("@/lib/bevis/houseAlert.server");
    return checkHouseWallet(data.force ?? false);
  });

/** Is the signed-in account an operator? Drives the nav link. */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context as any).supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: data === true };
  });
