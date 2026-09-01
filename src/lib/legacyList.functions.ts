import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LegacyListResult = {
  available: boolean;
  reason?: string;
  wallets: Array<{ assetId?: string; publicKey?: string; name?: string | null }>;
};

/**
 * Pulls the signed-in user's saved asset list out of the Cold Storage Coins
 * Admin registry. The registry exposes a server-to-server variant of
 * `/bevis/legacy-list` keyed on email and authenticated with an issued API
 * key, so our own auth tokens never have to validate over there.
 */
export const fetchLegacyList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LegacyListResult> => {
    const apiKey = process.env["LEGACY_API_KEY"];
    if (!apiKey) {
      return { available: false, reason: "not_configured", wallets: [] };
    }

    const email = (context.claims as { email?: string } | null)?.email;
    if (!email) return { available: false, reason: "no_email", wallets: [] };

    const host = (process.env["LEGACY_API_URL"] ?? "https://admin.coldstoragecoins.com").replace(/\/+$/, "");
    const url = `${host}/api/public/app/v1/bevis/legacy-list?email=${encodeURIComponent(email)}&currency=usd`;

    const res = await fetch(url, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
    if (!res.ok) {
      return { available: false, reason: `http_${res.status}`, wallets: [] };
    }

    const json = (await res.json().catch(() => null)) as
      | { items?: unknown; wallets?: unknown; coins?: unknown; assets?: unknown }
      | null;
    const raw = (json?.items ?? json?.wallets ?? json?.coins ?? json?.assets ?? []) as unknown;
    const list = Array.isArray(raw) ? raw : [];

    const wallets = list.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const r = item as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      const coinInfo = (r["coinInfo"] ?? {}) as Record<string, unknown>;
      const publicKey =
        str(r["publicKey"]) ?? str(r["public_key"]) ?? str(r["address"]) ?? str(coinInfo["coinID"]);
      const assetId = str(r["assetId"]) ?? str(r["asset_id"]) ?? str(r["id"]);
      if (!publicKey && !assetId) return [];
      return [{ publicKey, assetId, name: str(r["name"]) ?? str(r["label"]) ?? null }];
    });

    return { available: true, wallets };
  });

