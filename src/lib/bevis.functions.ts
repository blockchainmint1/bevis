/**
 * BEVIS server functions — Blockchain-enabled Verification & Information Service.
 *
 * The publish path is deliberately split:
 *   1. The browser hashes (and optionally encrypts) the file and uploads it
 *      straight to private storage under `<user-id>/…`.
 *   2. It then calls `publishBevisFile` with the fingerprint + metadata.
 *      The server mints the asset's TXC key pair, records the file, and
 *      anchors the SHA-256 on chain via OP_RETURN.
 *
 * Anchoring is best-effort: if the TXC node is down the record is stored with
 * `anchor_status = 'pending'` and can be retried with `retryAnchor`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type BevisAssetSummary = {
  id: string;
  assetId: string;
  publicKey: string;
  chain: string;
  name: string | null;
  createdAt: string;
  fileCount: number;
  anchoredCount: number;
  latestFileName: string | null;
};

export type BevisFileRecord = {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  sha256: string;
  encrypted: boolean;
  storagePath: string | null;
  fileCid: string | null;
  manifestCid: string | null;
  metadata: Record<string, Json>;
  anchorStatus: string;
  anchorTxid: string | null;
  anchorError: string | null;
  anchoredAt: string | null;
  createdAt: string;
};

const publishInput = z.object({
  /** Omit to mint a brand-new asset; pass an existing 6-char ID to append. */
  assetId: z.string().trim().length(6).optional().nullable(),
  assetName: z.string().trim().max(160).optional().nullable(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(255).optional().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  encrypted: z.boolean(),
  storagePath: z.string().trim().min(1),
  metadata: z.record(z.unknown()).default({}),
});

export const publishBevisFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // The upload lands under the caller's own folder; refuse anything else.
    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path.");
    }

    let assetRow: { id: string; asset_id: string; public_key: string } | null = null;

    if (data.assetId) {
      const { data: found, error } = await supabase
        .from("bevis_assets")
        .select("id, asset_id, public_key")
        .eq("asset_id", data.assetId.toUpperCase())
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!found) throw new Error("That Asset ID isn't one of yours.");
      assetRow = found;
    } else {
      const { generateAssetKey } = await import("@/lib/bevis/assetKey.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      for (let attempt = 0; attempt < 5 && !assetRow; attempt += 1) {
        const key = generateAssetKey();
        const { data: inserted, error } = await supabase
          .from("bevis_assets")
          .insert({
            user_id: userId,
            asset_id: key.assetId,
            public_key: key.publicKey,
            chain: "txc",
            name: data.assetName || data.fileName,
          })
          .select("id, asset_id, public_key")
          .single();
        if (error) {
          if (error.code === "23505") continue; // ID collision — draw again
          throw new Error(error.message);
        }
        assetRow = inserted;
        await supabaseAdmin
          .from("bevis_asset_keys")
          .insert({ asset_uuid: inserted.id, priv_key_hex: key.privKeyHex });
      }
      if (!assetRow) throw new Error("Could not mint a unique asset key.");
    }

    const { data: fileRow, error: fileError } = await supabase
      .from("bevis_files")
      .insert({
        asset_uuid: assetRow.id,
        user_id: userId,
        file_name: data.fileName,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes,
        sha256: data.sha256,
        encrypted: data.encrypted,
        storage_path: data.storagePath,
        metadata: data.metadata as never,
        anchor_status: "pending",
      })
      .select("id")
      .single();
    if (fileError) throw new Error(fileError.message);

    // Pin the bytes, then pin a manifest that points at them, then stamp the
    // manifest's CID onto the chain and pay dust to the asset's own address.
    const { pinFile, pinJson, gatewayUrl, MAX_IPFS_FILE_BYTES } = await import("@/lib/bevis/ipfs.server");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    let fileCid: string | null = null;
    if (data.sizeBytes <= MAX_IPFS_FILE_BYTES) {
      const { data: blob } = await admin.storage.from("bevis-files").download(data.storagePath);
      if (blob) {
        fileCid = await pinFile(
          data.fileName,
          await blob.arrayBuffer(),
          data.encrypted ? "application/octet-stream" : data.mimeType || "application/octet-stream",
        );
      }
    }

    const manifest = {
      bevis: "1",
      service: "Blockchain-enabled Verification & Information Service",
      chain: "txc",
      asset: {
        assetId: assetRow.asset_id,
        address: assetRow.public_key,
      },
      file: {
        name: data.fileName,
        mimeType: data.mimeType ?? null,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        encrypted: data.encrypted,
        cid: fileCid,
        url: fileCid ? gatewayUrl(fileCid) : null,
      },
      metadata: data.metadata,
      notarisedAt: new Date().toISOString(),
      verify: `https://app.bevis.sg/verify/${assetRow.asset_id}`,
    };
    const manifestCid = await pinJson(`bevis-${assetRow.asset_id}-${data.sha256.slice(0, 12)}.json`, manifest);

    const { anchorBevis } = await import("@/lib/bevis/txc.server");
    const anchor = await anchorBevis({
      sha256Hex: data.sha256,
      manifestCid,
      address: assetRow.public_key,
    });

    await supabase
      .from("bevis_files")
      .update({
        file_cid: fileCid,
        manifest_cid: manifestCid,
        ...(anchor.ok
          ? {
              anchor_status: "anchored",
              anchor_txid: anchor.txid,
              anchor_address: anchor.address,
              anchored_at: new Date().toISOString(),
            }
          : { anchor_status: "pending", anchor_error: anchor.error }),
      })
      .eq("id", fileRow.id);

    return {
      assetUuid: assetRow.id,
      assetId: assetRow.asset_id,
      publicKey: assetRow.public_key,
      fileId: fileRow.id,
      fileCid,
      manifestCid,
      anchorStatus: anchor.ok ? "anchored" : "pending",
      txid: anchor.ok ? anchor.txid : null,
      anchorError: anchor.ok ? null : anchor.error,
    };
  });


export const retryAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("bevis_files")
      .select("id, sha256, anchor_status, manifest_cid, asset_uuid")
      .eq("id", data.fileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("File not found.");
    if (row.anchor_status === "anchored") return { ok: true, txid: null, alreadyAnchored: true };

    const { data: asset } = await supabase
      .from("bevis_assets")
      .select("public_key")
      .eq("id", row.asset_uuid)
      .maybeSingle();

    const { anchorBevis } = await import("@/lib/bevis/txc.server");
    const anchor = await anchorBevis({
      sha256Hex: row.sha256,
      manifestCid: row.manifest_cid,
      address: asset?.public_key ?? null,
    });
    await supabase
      .from("bevis_files")
      .update(
        anchor.ok
          ? {
              anchor_status: "anchored",
              anchor_txid: anchor.txid,
              anchor_address: anchor.address,
              anchored_at: new Date().toISOString(),
              anchor_error: null,
            }
          : { anchor_error: anchor.error },
      )
      .eq("id", row.id);

    return anchor.ok
      ? { ok: true as const, txid: anchor.txid, alreadyAnchored: false }
      : { ok: false as const, error: anchor.error };
  });

export const listMyBevisAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BevisAssetSummary[]> => {
    const { data, error } = await context.supabase
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at, bevis_files(file_name, anchor_status, created_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map(row => {
      const files = (row.bevis_files ?? []) as Array<{
        file_name: string;
        anchor_status: string;
        created_at: string;
      }>;
      const sorted = [...files].sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {
        id: row.id,
        assetId: row.asset_id,
        publicKey: row.public_key,
        chain: row.chain,
        name: row.name,
        createdAt: row.created_at,
        fileCount: files.length,
        anchoredCount: files.filter(f => f.anchor_status === "anchored").length,
        latestFileName: sorted[0]?.file_name ?? null,
      };
    });
  });

export const getMyBevisAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ assetId: z.string().trim().min(6).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const key = data.assetId.trim();
    const { data: asset, error } = await context.supabase
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at")
      .or(`asset_id.eq.${key.toUpperCase()},public_key.eq.${key}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) return null;

    const { data: files, error: filesError } = await context.supabase
      .from("bevis_files")
      .select("*")
      .eq("asset_uuid", asset.id)
      .order("created_at", { ascending: false });
    if (filesError) throw new Error(filesError.message);

    return {
      id: asset.id,
      assetId: asset.asset_id,
      publicKey: asset.public_key,
      chain: asset.chain,
      name: asset.name,
      createdAt: asset.created_at,
      files: (files ?? []).map(mapFile),
    };
  });

export const renameBevisAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ assetId: z.string().trim().length(6), name: z.string().trim().min(1).max(160) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bevis_assets")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("asset_id", data.assetId.toUpperCase());
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBevisAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ assetId: z.string().trim().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bevis_assets")
      .delete()
      .eq("asset_id", data.assetId.toUpperCase());
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Public record lookup — this is what a scanned BEVIS QR resolves to.
 *
 * Notarisation is only useful if anyone can check it, so this endpoint is
 * unauthenticated. It returns the proof (fingerprints, timestamps, chain
 * anchors, declared metadata) but never the stored file itself.
 */
export const lookupBevisRecord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        key: z.string().trim().min(6).max(120),
        /** Optional override so testers can point at a different admin host. */
        adminBase: z.string().trim().url().max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const raw = data.key.trim().replace(/^bevis:\/\//i, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asset } = await supabaseAdmin
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at")
      .or(`asset_id.eq.${raw.toUpperCase()},public_key.eq.${raw}`)
      .maybeSingle();

    // New records live here. Anything older was minted on the Cold Storage
    // Coins Admin backend, so a miss falls through to that registry rather
    // than dragging its whole dataset over.
    if (!asset) {
      const legacy = await lookupLegacyRecord(raw, data.adminBase ?? null);
      if (legacy) return legacy;
      return { found: false as const, key: raw };
    }

    const { data: files } = await supabaseAdmin
      .from("bevis_files")
      .select(
        "id, file_name, mime_type, size_bytes, sha256, encrypted, metadata, file_cid, manifest_cid, anchor_status, anchor_txid, anchor_address, anchored_at, created_at",
      )
      .eq("asset_uuid", asset.id)
      .order("created_at", { ascending: false });

    return {
      found: true as const,
      source: "bevis" as const,
      assetId: asset.asset_id,
      publicKey: asset.public_key,
      chain: asset.chain,
      name: asset.name,
      createdAt: asset.created_at,
      legacy: null,
      files: (files ?? []).map(f => ({
        id: f.id,
        fileName: f.file_name,
        mimeType: f.mime_type,
        sizeBytes: Number(f.size_bytes ?? 0),
        sha256: f.sha256,
        encrypted: f.encrypted,
        fileCid: f.file_cid ?? null,
        manifestCid: f.manifest_cid ?? null,
        metadata: (f.metadata ?? {}) as Record<string, Json>,
        anchorStatus: f.anchor_status,
        anchorTxid: f.anchor_txid,
        anchoredAt: f.anchored_at,
        createdAt: f.created_at,
      })),
    };
  });

/**
 * Second place to look: the Cold Storage Coins Admin registry (`app-v1`).
 * Every coin we ever manufactured is a BEVIS asset, but those records were
 * minted before this backend existed, so the scanner checks there too.
 */
async function lookupLegacyRecord(raw: string, base: string | null) {
  const host = (base ?? "https://admin.coldstoragecoins.com").replace(/\/+$/, "");
  const keys = Array.from(new Set([raw, raw.toLowerCase(), raw.toUpperCase()]));

  try {
    // `/coins/verify` is the single-key resolver and is the one that actually
    // matches short Asset IDs; `/coins/lookup` is a batch endpoint keyed on
    // full public keys, so it misses a scanned six-character ID. Try verify
    // first, then fall back to the batch form.
    let coin: Record<string, unknown> | undefined;

    for (const key of keys) {
      const vres = await fetch(`${host}/api/public/app/v1/coins/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-version": "5.0.3" },
        body: JSON.stringify({ key }),
      });
      if (!vres.ok) continue;
      const vjson = (await vres.json().catch(() => null)) as
        | { authentic?: boolean; coin?: Record<string, unknown> }
        | null;
      if (vjson?.coin) {
        coin = vjson.coin;
        break;
      }
    }

    if (!coin) {
      const res = await fetch(`${host}/api/public/app/v1/coins/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-version": "5.0.3" },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as
        | { coins?: Array<Record<string, unknown>> }
        | null;
      coin = json?.coins?.[0];
    }
    if (!coin) return null;


    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const publicKey = str(coin["publicKey"]) ?? raw;

    return {
      found: true as const,
      source: "legacy" as const,
      assetId: str(coin["assetId"]) ?? raw.toUpperCase(),
      publicKey,
      chain: (str(coin["blockchainCode"]) ?? "txc").toLowerCase(),
      name: str(coin["blockchainName"]),
      createdAt: str(coin["createdAt"]) ?? new Date(0).toISOString(),
      legacy: {
        blockchainName: str(coin["blockchainName"]),
        cryptoCurrency: str(coin["cryptoCurrency"]),
        activated: coin["activationStatus"] === true,
        stickerImgUrl: str(coin["stickerImgUrl"]),
        publicKeyUrl: str(coin["publicKeyUrl"]),
      },
      files: [] as Array<{
        id: string;
        fileName: string;
        mimeType: string | null;
        sizeBytes: number;
        sha256: string;
        encrypted: boolean;
        fileCid: string | null;
        manifestCid: string | null;
        metadata: Record<string, Json>;
        anchorStatus: string;
        anchorTxid: string | null;
        anchoredAt: string | null;
        createdAt: string;
      }>,
    };
  } catch {
    return null;
  }
}

/** Short-lived signed URL so the owner can download their own stored file. */
export const getBevisFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bevis_files")
      .select("storage_path")
      .eq("id", data.fileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.storage_path) throw new Error("This record has no stored file.");

    const { data: signed, error: signError } = await context.supabase.storage
      .from("bevis-files")
      .createSignedUrl(row.storage_path, 300);
    if (signError) throw new Error(signError.message);
    return { url: signed.signedUrl };
  });

type RawFile = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | string;
  sha256: string;
  encrypted: boolean;
  storage_path: string | null;
  file_cid?: string | null;
  manifest_cid?: string | null;
  metadata: unknown;
  anchor_status: string;
  anchor_txid: string | null;
  anchor_error: string | null;
  anchored_at: string | null;
  created_at: string;
};

function mapFile(f: RawFile): BevisFileRecord {
  return {
    id: f.id,
    fileName: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: Number(f.size_bytes ?? 0),
    sha256: f.sha256,
    encrypted: f.encrypted,
    storagePath: f.storage_path,
    fileCid: f.file_cid ?? null,
    manifestCid: f.manifest_cid ?? null,
    metadata: (f.metadata ?? {}) as Record<string, Json>,
    anchorStatus: f.anchor_status,
    anchorTxid: f.anchor_txid,
    anchorError: f.anchor_error,
    anchoredAt: f.anchored_at,
    createdAt: f.created_at,
  };
}

/**
 * Anchoring budget health.
 *
 * Notarisation quietly stops working when the anchoring wallet runs dry, so
 * this exposes the address, its balance and roughly how many more stamps it
 * can pay for. Public on purpose: it reveals nothing but an address anyone
 * can already see on chain, and it lets anybody notice the tank is low.
 */
export const getAnchorWalletStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { anchorWalletStatus } = await import("@/lib/bevis/txc.server");
    const status = await anchorWalletStatus();
    return { ok: true as const, ...status };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message || "Anchoring wallet unavailable." };
  }
});

/**
 * The chain ledger for an asset address.
 *
 * Public on purpose: the whole point of notarising to a chain is that anyone
 * can read the record back without asking us. Everything returned here is
 * already visible in any TEXITcoin block explorer.
 */
export const getChainLedger = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ address: z.string().trim().min(20).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { readChainLedger, explorerAddressUrl, explorerTxUrl } = await import(
      "@/lib/bevis/chainLedger.server"
    );
    const ledger = await readChainLedger(data.address);
    return {
      ...ledger,
      explorerUrl: explorerAddressUrl(data.address),
      entries: ledger.entries.map(e => ({ ...e, txUrl: explorerTxUrl(e.txid) })),
    };
  });

