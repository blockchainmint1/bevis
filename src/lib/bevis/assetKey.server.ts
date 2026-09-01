/**
 * Per-asset TEXITcoin key generation.
 *
 * Every BEVIS asset gets its own key pair. The public address IS the asset's
 * identity — it's what the QR code encodes and what anyone can look up to see
 * everything published under it. The 6-character Asset ID is a short,
 * human-speakable handle derived from that address, matching the convention
 * already used by Cold Storage Coins.
 */

import { getPublicKey } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { base58check } from "@scure/base";

/** TEXITcoin mainnet P2PKH version byte (addresses start with "T"). */
const TXC_PUBKEY_VERSION = 0x42;

export type GeneratedAssetKey = {
  privKeyHex: string;
  publicKey: string;
  assetId: string;
};

function toHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

function addressFromPubkey(pubkeyCompressed: Uint8Array): string {
  const pkh20 = ripemd160(sha256(pubkeyCompressed));
  const payload = new Uint8Array(21);
  payload[0] = TXC_PUBKEY_VERSION;
  payload.set(pkh20, 1);
  return base58check(sha256).encode(payload);
}

/** Short handle: 6 characters taken from the address body. */
export function assetIdFromAddress(address: string): string {
  return address.slice(1, 7).toUpperCase();
}

/** Fresh random TXC key pair for a new asset. */
export function generateAssetKey(): GeneratedAssetKey {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const priv = crypto.getRandomValues(new Uint8Array(32));
    try {
      const pub = getPublicKey(priv, true);
      const publicKey = addressFromPubkey(pub);
      return { privKeyHex: toHex(priv), publicKey, assetId: assetIdFromAddress(publicKey) };
    } catch {
      // Astronomically unlikely out-of-range scalar; draw again.
    }
  }
  throw new Error("Could not generate an asset key.");
}
