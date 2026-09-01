/**
 * Self-custodied TEXITcoin signer for BEVIS anchoring.
 *
 * Anchoring used to lean on the node's own wallet RPC, which means the
 * anchor budget lives on a machine nobody here controls or refills. This
 * module instead builds and signs the anchor transaction locally from the
 * `SEED` mnemonic, so topping up one known address keeps notarisation alive.
 *
 * Only the node's *public* RPC surface is used: `scantxoutset` to find our
 * coins and `sendrawtransaction` to broadcast. The private key never leaves
 * this server.
 *
 * Chain docs: https://texitcoin.org/build
 */

import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { base58check } from "@scure/base";
import * as secp from "@noble/secp256k1";

/**
 * noble-secp256k1 v3 ships without a bundled hash: synchronous signing needs
 * SHA-256 and HMAC-SHA256 wired in explicitly, or it throws
 * "hashes.sha256 not set".
 */
secp.hashes.sha256 = (...msgs: Uint8Array[]) => sha256(concatBytes(...msgs));
secp.hashes.hmacSha256 = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, concatBytes(...msgs));

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const TXC_PUBKEY_VERSION = 0x42;
const TXC_PATH = "m/44'/696969'/0'/0/0";
const SATS = 100_000_000;

/** Flat fee per anchor, in satoshis. Anchors are tiny (1–2 inputs). */
const FEE_SATS = 100_000; // 0.001 TXC
/** Ignore change below this; it costs more to spend than it is worth. */
const DUST_SATS = 1_000;

const b58 = base58check(sha256);

function hash160(b: Uint8Array): Uint8Array {
  return ripemd160(sha256(b));
}

function toHex(b: Uint8Array): string {
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function u64le(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(Math.round(n)), true);
  return b;
}

function varint(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.from([n]);
  if (n <= 0xffff) return concat(Uint8Array.from([0xfd]), u32le(n).slice(0, 2));
  return concat(Uint8Array.from([0xfe]), u32le(n));
}

function withLength(script: Uint8Array): Uint8Array {
  return concat(varint(script.length), script);
}

/** Decode a base58check P2PKH address into its 20-byte hash. */
function addressToHash160(address: string): Uint8Array {
  const payload = b58.decode(address);
  if (payload.length !== 21) throw new Error(`Unsupported address: ${address}`);
  return payload.slice(1);
}

function p2pkhScript(address: string): Uint8Array {
  return concat(Uint8Array.from([0x76, 0xa9, 0x14]), addressToHash160(address), Uint8Array.from([0x88, 0xac]));
}

function opReturnScript(data: Uint8Array): Uint8Array {
  if (data.length <= 75) return concat(Uint8Array.from([0x6a, data.length]), data);
  return concat(Uint8Array.from([0x6a, 0x4c, data.length]), data);
}

export type AnchorWallet = {
  address: string;
  privKey: Uint8Array;
  pubKey: Uint8Array;
  script: Uint8Array;
};

/** Derive the anchoring wallet from the `SEED` secret. Throws if unusable. */
export function loadAnchorWallet(): AnchorWallet {
  const mnemonic = (process.env["SEED"] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!mnemonic) throw new Error("SEED is not configured.");
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error("SEED is not a valid BIP-39 mnemonic.");

  const node = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive(TXC_PATH);
  if (!node.privateKey || !node.publicKey) throw new Error("Could not derive the anchoring key.");

  const pubKey = node.publicKey;
  const address = b58.encode(concat(Uint8Array.from([TXC_PUBKEY_VERSION]), hash160(pubKey)));
  return { address, privKey: node.privateKey, pubKey, script: p2pkhScript(address) };
}

/** Cost of a single anchor, in satoshis: network fee plus the asset's dust inbox. */
export const ANCHOR_COST_SATS = FEE_SATS + DUST_SATS;
export const SATS_PER_TXC = SATS;

/**
 * Every account (and every signed-out device) gets its own deposit address,
 * derived deterministically from the same seed at a distinct index. The user
 * funds that address; their own coins pay for their own anchors. Nothing is
 * stored — the address is recomputed from the owner key each time.
 */
export function deriveOwnerWallet(ownerKey: string): AnchorWallet {
  const mnemonic = (process.env["SEED"] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!mnemonic) throw new Error("SEED is not configured.");
  if (!validateMnemonic(mnemonic, wordlist)) throw new Error("SEED is not a valid BIP-39 mnemonic.");

  const digest = sha256(new TextEncoder().encode(ownerKey));
  const index =
    (((digest[0]! << 23) | (digest[1]! << 15) | (digest[2]! << 7) | (digest[3]! >> 1)) >>> 0) % 0x7fffffff;

  const node = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive(`m/44'/696969'/1'/0/${index}`);
  if (!node.privateKey || !node.publicKey) throw new Error("Could not derive your fuel key.");

  const pubKey = node.publicKey;
  const address = b58.encode(concat(Uint8Array.from([TXC_PUBKEY_VERSION]), hash160(pubKey)));
  return { address, privKey: node.privateKey, pubKey, script: p2pkhScript(address) };
}

export type Utxo = { txid: string; vout: number; sats: number };

type Rpc = <T>(method: string, params?: unknown[]) => Promise<T>;

/** Scan the chain's UTXO set for coins belonging to `address`. */
export async function fetchUtxos(rpc: Rpc, address: string): Promise<Utxo[]> {
  const res = await rpc<{ unspents?: Array<{ txid: string; vout: number; amount: number }> }>(
    "scantxoutset",
    ["start", [{ desc: `addr(${address})` }]],
  );
  return (res.unspents ?? [])
    .map(u => ({ txid: u.txid, vout: u.vout, sats: Math.round(u.amount * SATS) }))
    .sort((a, b) => b.sats - a.sats);
}

type Output = { script: Uint8Array; sats: number };

function serialize(
  inputs: Array<{ txid: string; vout: number; script: Uint8Array }>,
  outputs: Output[],
): Uint8Array {
  const parts: Uint8Array[] = [u32le(1), varint(inputs.length)];
  for (const i of inputs) {
    parts.push(fromHex(i.txid).reverse(), u32le(i.vout), withLength(i.script), u32le(0xffffffff));
  }
  parts.push(varint(outputs.length));
  for (const o of outputs) parts.push(u64le(o.sats), withLength(o.script));
  parts.push(u32le(0));
  return concat(...parts);
}

/** DER-encode a 64-byte compact signature; Bitcoin scripts want DER. */
function compactToDer(compact: Uint8Array): Uint8Array {
  const trim = (v: Uint8Array) => {
    let i = 0;
    while (i < v.length - 1 && v[i] === 0) i++;
    const body = v.slice(i);
    return body[0]! & 0x80 ? concat(Uint8Array.from([0]), body) : body;
  };
  const r = trim(compact.slice(0, 32));
  const s = trim(compact.slice(32, 64));
  const seq = concat(Uint8Array.from([0x02, r.length]), r, Uint8Array.from([0x02, s.length]), s);
  return concat(Uint8Array.from([0x30, seq.length]), seq);
}

/**
 * Build, sign and return the raw hex of a legacy P2PKH transaction spending
 * `utxos` from `wallet`, with SIGHASH_ALL on every input.
 */
export function buildSignedTx(wallet: AnchorWallet, utxos: Utxo[], outputs: Output[]): string {
  const inputs = utxos.map(u => ({ txid: u.txid, vout: u.vout, script: new Uint8Array(0) }));

  const signatures = inputs.map((_, index) => {
    const forSigning = inputs.map((inp, i) => ({ ...inp, script: i === index ? wallet.script : new Uint8Array(0) }));
    const preimage = concat(serialize(forSigning, outputs), u32le(1)); // SIGHASH_ALL
    const digest = sha256(sha256(preimage));
    const compact = secp.sign(digest, wallet.privKey, { lowS: true, format: "compact" });
    return concat(compactToDer(compact), Uint8Array.from([0x01]));

  });

  const signed = inputs.map((inp, i) => {
    const sig = signatures[i]!;
    return {
      ...inp,
      script: concat(
        Uint8Array.from([sig.length]),
        sig,
        Uint8Array.from([wallet.pubKey.length]),
        wallet.pubKey,
      ),
    };
  });

  return toHex(serialize(signed, outputs));
}

export type SeedAnchorInput = {
  /** Raw OP_RETURN payload bytes (marker + CID or hash). */
  data: Uint8Array;
  /** Asset address that receives the dust "inbox" output. */
  address?: string | null;
  /** Dust amount in satoshis. */
  dustSats: number;
  /** Whose coins pay. Omit to spend the house wallet. */
  ownerKey?: string | null;
};

/**
 * Compose the anchor transaction and hand back the raw hex ready to
 * broadcast. Spends the owner's own fuel address when `ownerKey` is given.
 */
export async function buildSeedAnchorTx(rpc: Rpc, input: SeedAnchorInput): Promise<string> {
  const wallet = input.ownerKey ? deriveOwnerWallet(input.ownerKey) : loadAnchorWallet();
  const utxos = await fetchUtxos(rpc, wallet.address);
  if (utxos.length === 0) throw new Error(`Anchoring wallet ${wallet.address} has no funds.`);

  const dust = input.address ? Math.max(input.dustSats, DUST_SATS) : 0;
  const target = dust + FEE_SATS;

  const chosen: Utxo[] = [];
  let total = 0;
  for (const u of utxos) {
    chosen.push(u);
    total += u.sats;
    if (total >= target) break;
  }
  if (total < target) {
    throw new Error(`Anchoring wallet ${wallet.address} is short of funds (needs ${(target / SATS).toFixed(8)} TXC).`);
  }

  const outputs: Output[] = [{ script: opReturnScript(input.data), sats: 0 }];
  if (input.address && dust > 0) outputs.push({ script: p2pkhScript(input.address), sats: dust });

  const change = total - target;
  if (change > DUST_SATS) outputs.push({ script: wallet.script, sats: change });

  return buildSignedTx(wallet, chosen, outputs);
}

/** Spendable balance of an anchoring wallet, in TXC. */
export async function anchorWalletBalance(rpc: Rpc, ownerKey?: string | null) {
  const wallet = ownerKey ? deriveOwnerWallet(ownerKey) : loadAnchorWallet();
  const utxos = await fetchUtxos(rpc, wallet.address);
  const sats = utxos.reduce((n, u) => n + u.sats, 0);
  return {
    address: wallet.address,
    balanceTxc: sats / SATS,
    utxoCount: utxos.length,
    /** Roughly how many more anchors the current balance can pay for. */
    anchorsRemaining: Math.max(0, Math.floor(sats / (FEE_SATS + DUST_SATS))),
  };
}
