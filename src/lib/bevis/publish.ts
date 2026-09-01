/**
 * Browser-side publish pipeline.
 *
 * inspect → (optionally) encrypt → upload to private storage → notarise.
 * The SHA-256 sent to the chain is always of the ORIGINAL bytes.
 */

import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { MAX_GUEST_FILE_BYTES } from "@/lib/bevisGuest.functions";
import { encryptBytes } from "./crypto";
import type { BevisFileMetadata } from "./metadata";

export type PublishOptions = {
  file: File;
  bytes: ArrayBuffer;
  metadata: BevisFileMetadata;
  encrypt: boolean;
  passphrase?: string;
  /** Append to an existing asset instead of minting a new one. */
  assetId?: string | null;
  assetName?: string | null;
  onStep?: (step: string) => void;
};

export type PublishOutcome = {
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

export async function uploadAndPublish(
  publishFn: (args: { data: Record<string, unknown> }) => Promise<PublishOutcome>,
  opts: PublishOptions,
  /** Guest path: no account, so the bytes go up through the server function. */
  guestPublishFn?: (args: { data: Record<string, unknown> }) => Promise<PublishOutcome>,
): Promise<PublishOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId && !guestPublishFn) throw new Error("Sign in to publish an asset.");

  let body: Blob = opts.file;
  if (opts.encrypt) {
    if (!opts.passphrase || opts.passphrase.length < 8) {
      throw new Error("Choose a passphrase of at least 8 characters.");
    }
    opts.onStep?.("Encrypting on this device…");
    body = await encryptBytes(opts.bytes, opts.passphrase);
  }

  const common = {
    assetId: opts.assetId ?? undefined,
    assetName: opts.assetName ?? undefined,
    fileName: opts.file.name,
    mimeType: opts.file.type || "application/octet-stream",
    sizeBytes: opts.file.size,
    sha256: opts.metadata.sha256,
    encrypted: opts.encrypt,
    metadata: opts.metadata as unknown as Record<string, unknown>,
  };

  // No account: hand the bytes to the server, which stores them against this
  // device and runs the identical IPFS + chain pipeline.
  if (!userId && guestPublishFn) {
    if (body.size > MAX_GUEST_FILE_BYTES) {
      throw new Error("Files up to 12 MB can be notarised without an account. Sign in for larger files.");
    }
    opts.onStep?.("Uploading…");
    const bodyBase64 = toBase64(await body.arrayBuffer());
    opts.onStep?.("Pinning to IPFS and stamping the TEXITcoin chain…");
    return guestPublishFn({ data: { ...common, deviceId: getDeviceId(), bodyBase64 } });
  }

  const safeName = opts.file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120);
  const storagePath = `${userId}/${opts.metadata.sha256.slice(0, 12)}-${Date.now()}-${safeName}${
    opts.encrypt ? ".bevis" : ""
  }`;

  opts.onStep?.("Uploading…");
  const { error: uploadError } = await supabase.storage
    .from("bevis-files")
    .upload(storagePath, body, {
      contentType: opts.encrypt ? "application/octet-stream" : opts.file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  opts.onStep?.("Pinning to IPFS and stamping the TEXITcoin chain…");
  return publishFn({ data: { ...common, storagePath } });
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
