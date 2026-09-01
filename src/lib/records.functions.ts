/**
 * Account-backed record list.
 *
 * A signed-in user's saved records live in `watched_addresses` so they follow
 * the account across devices/domains, instead of only living in this browser's
 * localStorage.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectChain } from "./parseCoinPayload";
import type { ChainId } from "./chains";

export type SavedRecord = {
  id: string;
  chain: ChainId;
  address: string;
  label: string | null;
  assetId: string | null;
  createdAt: string;
};

const CHAIN_VALUES = [
  "btc", "eth", "ltc", "doge", "bch", "bsc", "ada", "sol", "bnb", "txc", "iskander",
] as const;
const ChainSchema = z.enum(CHAIN_VALUES);

export const listMyRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedRecord[]> => {
    const { data, error } = await context.supabase
      .from("watched_addresses")
      .select("id,chain,address,label,serial,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => ({
      id: r.id,
      chain: r.chain as ChainId,
      address: r.address,
      label: r.label,
      assetId: r.serial,
      createdAt: r.created_at,
    }));
  });

export const saveRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        chain: ChainSchema,
        address: z.string().trim().min(8).max(120),
        label: z.string().trim().max(80).optional().nullable(),
        assetId: z.string().trim().max(60).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("watched_addresses")
      .select("id")
      .eq("address", data.address)
      .maybeSingle();
    if (existing) return { id: existing.id, created: false };

    const { data: row, error } = await context.supabase
      .from("watched_addresses")
      .insert({
        user_id: context.userId,
        chain: data.chain,
        address: data.address,
        label: data.label ?? null,
        serial: data.assetId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, created: true };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watched_addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), label: z.string().trim().max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("watched_addresses")
      .update({ label: data.label || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Pulls the account's legacy records out of the Cold Storage Coins registry
 * and writes any that are missing into `watched_addresses`. Idempotent.
 */
export const restoreLegacyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ available: boolean; reason?: string; added: number; total: number }> => {
    const { fetchLegacyWallets } = await import("./legacyRegistry.server");
    const email = (context.claims as { email?: string } | null)?.email;
    const res = await fetchLegacyWallets(email);
    if (!res.available) return { available: false, reason: res.reason, added: 0, total: 0 };

    const { data: existingRows } = await context.supabase
      .from("watched_addresses")
      .select("address");
    const have = new Set((existingRows ?? []).map(r => r.address.toLowerCase()));

    const rows: Array<{
      user_id: string; chain: string; address: string; label: string | null; serial: string | null;
    }> = [];
    const seen = new Set<string>();

    for (const w of res.wallets) {
      const pk = (w.publicKey ?? "").trim();
      if (!pk) continue;
      const parsed = detectChain(pk);
      if (!parsed) continue;
      const key = parsed.address.toLowerCase();
      if (have.has(key) || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: context.userId,
        chain: parsed.chain,
        address: parsed.address,
        label: w.name ?? null,
        serial: w.assetId ?? null,
      });
    }

    if (rows.length > 0) {
      const { error } = await context.supabase.from("watched_addresses").insert(rows);
      if (error) throw new Error(error.message);
    }

    return { available: true, added: rows.length, total: res.wallets.length };
  });
