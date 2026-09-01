/**
 * Guest (no account) notarisation.
 *
 * Anchoring costs us almost nothing, so anyone can create a record without
 * signing up. Ownership is the anonymous `device_id` minted in localStorage:
 * the browser sends the (already encrypted, if requested) bytes here, the
 * server stores them under `guest/<device>/…` with the service role and runs
 * the exact same IPFS + TEXITcoin pipeline as an account holder gets.
 *
 * The device id is a bearer secret — every read/write below is scoped to it.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BevisAssetSummary, BevisFileRecord, Json } from "@/lib/bevis.functions";

/** Guests upload through the server, so keep the payload sane. */
export const MAX_GUEST_FILE_BYTES = 12 * 1024 * 1024;

const DeviceId = z.string().uuid();

const guestPublishInput = z.object({
  deviceId: DeviceId,
  assetId: z.string().trim().length(6).optional().nullable(),
  assetName: z.string().trim().max(160).optional().nullable(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(255).optional().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  encrypted: z.boolean(),
  /** Base64 of the bytes to store (ciphertext when `encrypted`). */
  bodyBase64: z.string().min(4),
  metadata: z.record(z.unknown()).default({}),
});

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export const guestPublishBevisFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => guestPublishInput.parse(d))
  .handler(async ({ data }) => {
    const bytes = decodeBase64(data.bodyBase64);
    if (bytes.byteLength > MAX_GUEST_FILE_BYTES) {
      throw new Error("Files up to 12 MB can be notarised without an account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safeName = data.fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120);
    const storagePath = `guest/${data.deviceId}/${data.sha256.slice(0, 12)}-${Date.now()}-${safeName}${
      data.encrypted ? ".bevis" : ""
    }`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("bevis-files")
      .upload(storagePath, bytes, {
        contentType: data.encrypted ? "application/octet-stream" : data.mimeType || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { publishRecord } = await import("@/lib/bevis/publishCore.server");
    return publishRecord(
      { deviceId: data.deviceId },
      {
        assetId: data.assetId ?? null,
        assetName: data.assetName ?? null,
        fileName: data.fileName,
        mimeType: data.mimeType ?? null,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        encrypted: data.encrypted,
        storagePath,
        metadata: data.metadata,
      },
    );
  });

export const listGuestBevisAssets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ deviceId: DeviceId }).parse(d))
  .handler(async ({ data }): Promise<BevisAssetSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at, bevis_files(file_name, anchor_status, created_at)")
      .eq("device_id", data.deviceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map(row => {
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

export const getGuestBevisAsset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ deviceId: DeviceId, assetId: z.string().trim().min(6).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = data.assetId.trim();
    const { data: asset, error } = await supabaseAdmin
      .from("bevis_assets")
      .select("id, asset_id, public_key, chain, name, created_at")
      .eq("device_id", data.deviceId)
      .or(`asset_id.eq.${key.toUpperCase()},public_key.eq.${key}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) return null;

    const { data: files } = await supabaseAdmin
      .from("bevis_files")
      .select("*")
      .eq("asset_uuid", asset.id)
      .order("created_at", { ascending: false });

    return {
      id: asset.id,
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
        storagePath: f.storage_path,
        fileCid: f.file_cid ?? null,
        manifestCid: f.manifest_cid ?? null,
        metadata: (f.metadata ?? {}) as Record<string, Json>,
        anchorStatus: f.anchor_status,
        anchorTxid: f.anchor_txid,
        anchorError: f.anchor_error,
        anchoredAt: f.anchored_at,
        createdAt: f.created_at,
      })) as BevisFileRecord[],
    };
  });

/**
 * Adopt every guest record on this device into the account that just signed
 * in. Called after login so nothing made as a guest is stranded.
 */
export const claimGuestRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ deviceId: DeviceId }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const { data: assets } = await supabaseAdmin
      .from("bevis_assets")
      .update({ user_id: userId, device_id: null })
      .eq("device_id", data.deviceId)
      .is("user_id", null)
      .select("id");
    await supabaseAdmin
      .from("bevis_files")
      .update({ user_id: userId, device_id: null })
      .eq("device_id", data.deviceId)
      .is("user_id", null);
    return { ok: true, claimed: assets?.length ?? 0 };
  });
