/**
 * Server-only reader for the Cold Storage Coins Admin registry.
 * One place that knows the endpoint shape, shared by the legacy list fn and
 * the account-restore fn.
 */

export type LegacyWallet = { assetId?: string; publicKey?: string; name?: string | null };

export type LegacyFetch =
  | { available: true; wallets: LegacyWallet[] }
  | { available: false; reason: string; wallets: LegacyWallet[] };

export async function fetchLegacyWallets(email: string | undefined): Promise<LegacyFetch> {
  const apiKey = process.env["LEGACY_API_KEY"];
  if (!apiKey) return { available: false, reason: "not_configured", wallets: [] };
  if (!email) return { available: false, reason: "no_email", wallets: [] };

  const host = (process.env["LEGACY_API_URL"] ?? "https://admin.coldstoragecoins.com").replace(/\/+$/, "");
  const url = `${host}/api/public/app/v1/bevis/legacy-list?email=${encodeURIComponent(email)}&currency=usd`;

  const res = await fetch(url, { headers: { "x-api-key": apiKey, Accept: "application/json" } });
  if (!res.ok) return { available: false, reason: `http_${res.status}`, wallets: [] };

  const json = (await res.json().catch(() => null)) as
    | { items?: unknown; wallets?: unknown; coins?: unknown; assets?: unknown }
    | null;
  const raw = (json?.items ?? json?.wallets ?? json?.coins ?? json?.assets ?? []) as unknown;
  const list = Array.isArray(raw) ? raw : [];

  const wallets = list.flatMap((item): LegacyWallet[] => {
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
}
