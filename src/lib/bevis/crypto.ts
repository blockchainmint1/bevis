/**
 * BEVIS client-side file crypto.
 *
 * Everything here runs in the browser. When a user chooses to encrypt an
 * asset, the plaintext never leaves the device — we derive a key from their
 * passphrase with PBKDF2 and upload only AES-256-GCM ciphertext.
 *
 * The SHA-256 fingerprint that gets stamped on chain is always computed over
 * the ORIGINAL bytes, so the notarised hash proves the real document, not the
 * ciphertext.
 */

const PBKDF2_ITERATIONS = 250_000;

/** Hex SHA-256 of the given bytes. */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt file bytes with a passphrase.
 * Output layout: magic "BEVIS1" | salt(16) | iv(12) | ciphertext.
 */
export async function encryptBytes(bytes: ArrayBuffer, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, bytes);
  const magic = new TextEncoder().encode("BEVIS1");
  return new Blob([magic as BufferSource, salt as BufferSource, iv as BufferSource, cipher]);
}

/** Reverse of {@link encryptBytes}. Throws when the passphrase is wrong. */
export async function decryptBytes(payload: ArrayBuffer, passphrase: string): Promise<ArrayBuffer> {
  const view = new Uint8Array(payload);
  const magic = new TextDecoder().decode(view.slice(0, 6));
  if (magic !== "BEVIS1") throw new Error("This file is not a BEVIS encrypted payload.");
  const salt = view.slice(6, 22);
  const iv = view.slice(22, 34);
  const key = await deriveKey(passphrase, salt);
  try {
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      view.slice(34) as BufferSource,
    );
  } catch {
    throw new Error("Wrong passphrase — could not decrypt this file.");
  }
}
