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
  metadata: Record<string, unknown>;
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

    const { anchorSha256 } = await import("@/lib/bevis/txc.server");
    const anchor = await anchorSha256(data.sha256);

    await supabase
      .from("bevis_files")
      .update(
        anchor.ok
          ? { anchor_status: "anchored", anchor_txid: anchor.txid, anchored_at: new Date().toISOString() }
          : { anchor_status: "pending", anchor_error: anchor.error },
      )
      .eq("id", fileRow.id);

    return {
      assetUuid: assetRow.id,
      assetId: assetRow.asset_id,
      publicKey: assetRow.public_key,
      fileId: fileRow.id,
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
      .select("id, sha256, anchor_status")
      .eq("id", data.fileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("File not found.");
    if (row.anchor_status === "anchored") return { ok: true, txid: null, alreadyAnchored: true };

    const { anchorSha256 } = await import("@/lib/bevis/txc.server");
    const anchor = await anchorSha256(row.sha256);
    await supabase
      .from("bevis_files")
      .update(
        anchor.ok
          ? { anchor_status: "anchored", anchor_txid: anchor.txid, anchored_at: new Date().toISOString(), anchor_error: null }
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
  .inputValidator((d: unknown) => z.object({ key: z.string().trim().min(6).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const raw = data.key.trim().replace(/^bevis:\/\//i, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asset } = await supabaseAdmin
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at")
      .or(`asset_id.eq.${raw.toUpperCase()},public_key.eq.${raw}`)
      .maybeSingle();

    if (!asset) return { found: false as const, key: raw };

    const { data: files } = await supabaseAdmin
      .from("bevis_files")
      .select(
        "id, file_name, mime_type, size_bytes, sha256, encrypted, metadata, anchor_status, anchor_txid, anchored_at, created_at",
      )
      .eq("asset_uuid", asset.id)
      .order("created_at", { ascending: false });

    return {
      found: true as const,
      assetId: asset.asset_id,
      publicKey: asset.public_key,
      chain: asset.chain,
      name: asset.name,
      createdAt: asset.created_at,
      files: (files ?? []).map(f => ({
        id: f.id,
        fileName: f.file_name,
        mimeType: f.mime_type,
        sizeBytes: Number(f.size_bytes ?? 0),
        sha256: f.sha256,
        encrypted: f.encrypted,
        metadata: (f.metadata ?? {}) as Record<string, unknown>,
        anchorStatus: f.anchor_status,
        anchorTxid: f.anchor_txid,
        anchoredAt: f.anchored_at,
        createdAt: f.created_at,
      })),
    };
  });

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
    metadata: (f.metadata ?? {}) as Record<string, unknown>,
    anchorStatus: f.anchor_status,
    anchorTxid: f.anchor_txid,
    anchorError: f.anchor_error,
    anchoredAt: f.anchored_at,
    createdAt: f.created_at,
  };
}
