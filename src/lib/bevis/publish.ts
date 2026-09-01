/**
 * Browser-side publish pipeline.
 *
 * inspect → (optionally) encrypt → upload to private storage → notarise.
 * The SHA-256 sent to the chain is always of the ORIGINAL bytes.
 */

import { supabase } from "@/integrations/supabase/client";
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
): Promise<PublishOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Sign in to publish an asset.");

  let body: Blob = opts.file;
  if (opts.encrypt) {
    if (!opts.passphrase || opts.passphrase.length < 8) {
      throw new Error("Choose a passphrase of at least 8 characters.");
    }
    opts.onStep?.("Encrypting on this device…");
    body = await encryptBytes(opts.bytes, opts.passphrase);
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
  return publishFn({
    data: {
      assetId: opts.assetId ?? undefined,
      assetName: opts.assetName ?? undefined,
      fileName: opts.file.name,
      mimeType: opts.file.type || "application/octet-stream",
      sizeBytes: opts.file.size,
      sha256: opts.metadata.sha256,
      encrypted: opts.encrypt,
      storagePath,
      metadata: opts.metadata as unknown as Record<string, unknown>,
    },
  });
}
