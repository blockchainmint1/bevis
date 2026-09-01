/**
 * Shared notarisation core.
 *
 * Identical work whether the caller is signed in or an anonymous device:
 * mint (or find) the asset, record the file, pin bytes + manifest to IPFS,
 * stamp the manifest CID onto the TEXITcoin chain. Ownership is either a
 * Supabase user id or an anonymous device id — never both.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublishOwner = { userId: string; deviceId?: null } | { userId?: null; deviceId: string };

export type PublishInput = {
  assetId?: string | null;
  assetName?: string | null;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  sha256: string;
  encrypted: boolean;
  storagePath: string;
  metadata: Record<string, unknown>;
};

export type PublishResult = {
  assetUuid: string;
  assetId: string;
  publicKey: string;
  fileId: string;
  fileCid: string | null;
  manifestCid: string | null;
  anchorStatus: string;
  txid: string | null;
  anchorError: string | null;
};

function ownerColumns(owner: PublishOwner) {
  return owner.userId
    ? { user_id: owner.userId, device_id: null as string | null }
    : { user_id: null as string | null, device_id: owner.deviceId ?? null };
}

/** Stable key for the owner's own fuel address. */
export function fuelKey(owner: PublishOwner): string {
  return owner.userId ? `user:${owner.userId}` : `device:${owner.deviceId}`;
}

export async function publishRecord(owner: PublishOwner, data: PublishInput): Promise<PublishResult> {
  const sb = supabaseAdmin;
  const cols = ownerColumns(owner);
  const ownerKey = fuelKey(owner);

  // Notarising costs TEXITcoin, and the owner pays it. Refuse up front rather
  // than storing a file that can never be stamped.
  const { hasFuel } = await import("@/lib/bevis/txc.server");
  const fuel = await hasFuel(ownerKey);
  if (!fuel.funded) {
    throw new Error(
      `Your notarisation fuel is empty. Send TXC to ${fuel.address} and try again.`,
    );
  }

  let assetRow: { id: string; asset_id: string; public_key: string } | null = null;

  if (data.assetId) {
    const base = sb
      .from("bevis_assets")
      .select("id, asset_id, public_key")
      .eq("asset_id", data.assetId.toUpperCase());
    const scoped = owner.userId
      ? base.eq("user_id", owner.userId)
      : base.eq("device_id", owner.deviceId as string);
    const { data: found, error } = await scoped.maybeSingle();
    if (error) throw new Error(error.message);
    if (!found) throw new Error("That Asset ID isn't one of yours.");
    assetRow = found;
  } else {
    const { generateAssetKey } = await import("@/lib/bevis/assetKey.server");

    for (let attempt = 0; attempt < 5 && !assetRow; attempt += 1) {
      const key = generateAssetKey();
      const { data: inserted, error } = await sb
        .from("bevis_assets")
        .insert({
          ...cols,
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
      await sb
        .from("bevis_asset_keys")
        .insert({ asset_uuid: inserted.id, priv_key_hex: key.privKeyHex });
    }
    if (!assetRow) throw new Error("Could not mint a unique asset key.");
  }

  const { data: fileRow, error: fileError } = await sb
    .from("bevis_files")
    .insert({
      ...cols,
      asset_uuid: assetRow.id,
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

  const { pinFile, pinJson, gatewayUrl, MAX_IPFS_FILE_BYTES } = await import("@/lib/bevis/ipfs.server");

  let fileCid: string | null = null;
  if (data.sizeBytes <= MAX_IPFS_FILE_BYTES) {
    const { data: blob } = await sb.storage.from("bevis-files").download(data.storagePath);
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
    asset: { assetId: assetRow.asset_id, address: assetRow.public_key },
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
  const manifestCid = await pinJson(
    `bevis-${assetRow.asset_id}-${data.sha256.slice(0, 12)}.json`,
    manifest,
  );

  const { anchorBevis } = await import("@/lib/bevis/txc.server");
  const anchor = await anchorBevis({
    sha256Hex: data.sha256,
    manifestCid,
    address: assetRow.public_key,
    ownerKey,
  });

  await sb
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
}
