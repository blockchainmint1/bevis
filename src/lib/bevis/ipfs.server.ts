/**
 * IPFS pinning for BEVIS, via Pinata.
 *
 * Two things get pinned per notarisation:
 *   1. the file itself (ciphertext when the user chose to encrypt), and
 *   2. a JSON manifest describing the record — fingerprints, declared
 *      metadata, asset identity, and a pointer to the file's CID.
 *
 * Only the manifest CID goes on chain. It is the root of the record: from
 * one 46-character string anyone can fetch the whole description and, if the
 * file is public, the bytes themselves.
 *
 * Pinning is best-effort. A Pinata outage must never lose a notarisation, so
 * every function here returns null instead of throwing.
 */

const PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PIN_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/** Files larger than this stay in private storage only. */
export const MAX_IPFS_FILE_BYTES = 25 * 1024 * 1024;

function jwt(): string | null {
  const raw = process.env["PINATA_JWT"];
  return raw && raw.trim() ? raw.trim() : null;
}

/** Public gateway URL for a CID, using the project's dedicated gateway if set. */
export function gatewayUrl(cid: string): string {
  const gw = (process.env["PINATA_GW"] ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return gw ? `https://${gw}/ipfs/${cid}` : `https://gateway.pinata.cloud/ipfs/${cid}`;
}

async function readCid(res: Response): Promise<string | null> {
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { IpfsHash?: string } | null;
  return json?.IpfsHash ?? null;
}

/** Pin a JSON document. Returns its CID, or null if pinning is unavailable. */
export async function pinJson(name: string, body: unknown): Promise<string | null> {
  const token = jwt();
  if (!token) return null;
  try {
    const res = await fetch(PIN_JSON, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 0 },
        pinataContent: body,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    return await readCid(res);
  } catch {
    return null;
  }
}

/** Pin raw bytes. Returns the CID, or null if pinning is unavailable. */
export async function pinFile(
  name: string,
  bytes: Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<string | null> {
  const token = jwt();
  if (!token) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: contentType }), name);
    form.append("pinataMetadata", JSON.stringify({ name }));
    form.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));
    const res = await fetch(PIN_FILE, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    return await readCid(res);
  } catch {
    return null;
  }
}
