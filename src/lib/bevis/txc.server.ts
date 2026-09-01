/**
 * TEXITcoin anchoring for BEVIS.
 *
 * A notarisation is one transaction with two outputs:
 *
 *   1. OP_RETURN  "BEVIS1" (6 bytes ASCII) || the manifest's IPFS CID (ASCII)
 *   2. a dust payment to the asset's own freshly-minted TXC address
 *
 * The OP_RETURN carries the record: the CID resolves to a JSON manifest with
 * the file's SHA-256, its own CID, and all declared metadata. The dust output
 * turns the asset address into a read-only inbox — every stamp ever made for
 * that asset shows up together in any block explorer. Nobody ever spends from
 * it, so no key for it is needed or kept.
 *
 * Funding and signing happen through the node's own wallet RPC.
 *
 * Docs for the chain and the Omni layer 2: https://texitcoin.org/build
 */

const PREFIX = "BEVIS1";

/** Standard relay policy caps an OP_RETURN payload at 80 bytes. */
const MAX_OP_RETURN_BYTES = 80;

/**
 * Value sent to the asset address so it appears in explorers. Must clear the
 * node's dust threshold or the whole transaction is rejected as "dust".
 */
const DUST_TXC = 0.001;

/** What BEVIS charges per notarisation, in US dollars. */
export const SERVICE_FEE_USD = 0.10;

/**
 * The service fee converted to satoshis at the live TXC price. Returns 0 when
 * no price is available — a pricing hiccup must never block a notarisation.
 */
export async function serviceFeeSats(): Promise<number> {
  try {
    const { priceUsd } = await import("@/lib/prices.server");
    const usd = await priceUsd("txc");
    if (!usd || !isFinite(usd) || usd <= 0) return 0;
    return Math.round((SERVICE_FEE_USD / usd) * 100_000_000);
  } catch {
    return 0;
  }
}

type RpcOk<T> = { result: T; error: null };
type RpcErr = { result: null; error: { code: number; message: string } };

function rpcUrl(): string {
  const raw = process.env["TXC_RPC_ADDRESS"];
  if (!raw) throw new Error("TXC RPC is not configured.");
  return raw.startsWith("http") ? raw : `http://${raw}`;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const user = process.env["TXC_RPC_USER"] ?? "";
  const pass = process.env["TXC_RPC_PASSWORD"] ?? "";
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${btoa(`${user}:${pass}`)}`,
    },
    body: JSON.stringify({ jsonrpc: "1.0", id: "bevis", method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as RpcOk<T> | RpcErr | null;
  if (!json) throw new Error(`TXC RPC ${method}: HTTP ${res.status}`);
  if (json.error) throw new Error(`TXC RPC ${method}: ${json.error.message}`);
  return json.result as T;
}

function asciiToHex(text: string): string {
  return [...text].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

/**
 * The hex data payload stamped into the OP_RETURN output: the BEVIS marker
 * followed by the manifest CID (or, with no CID, the bare SHA-256).
 */
export function anchorPayloadHex(input: { manifestCid?: string | null; sha256Hex: string }): string {
  const body = input.manifestCid?.trim() ? input.manifestCid.trim() : input.sha256Hex.toLowerCase();
  return asciiToHex(PREFIX + body);
}

export type AnchorResult =
  | { ok: true; txid: string; address: string | null }
  | { ok: false; error: string };

export type AnchorInput = {
  /** SHA-256 of the original file — the fallback payload and the record's core proof. */
  sha256Hex: string;
  /** IPFS CID of the JSON manifest. Preferred payload when present. */
  manifestCid?: string | null;
  /** The asset's TXC address; receives the dust output so stamps group there. */
  address?: string | null;
  /** Whose fuel pays for this anchor: `user:<id>` or `device:<id>`. */
  ownerKey?: string | null;
};

/**
 * Broadcast the anchor. Never throws — anchoring is best-effort so a node
 * outage can't lose the user's notarisation record.
 *
 * Signing is done here from the `SEED` secret, so the anchor budget sits on
 * an address we control and can top up. If the seed is unavailable we fall
 * back to the node's own wallet RPC.
 */
export async function anchorBevis(input: AnchorInput): Promise<AnchorResult> {
  const data = anchorPayloadHex(input);
  if (data.length / 2 > MAX_OP_RETURN_BYTES) {
    return { ok: false, error: "Anchor payload exceeds the 80-byte OP_RETURN limit." };
  }
  const address = input.address?.trim() || null;

  // Preferred path: build and sign locally from our own seed wallet.
  try {
    const { buildSeedAnchorTx } = await import("./txcWallet.server");
    const hex = await buildSeedAnchorTx(rpc, {
      data: hexToBytes(data),
      address,
      dustSats: Math.round(DUST_TXC * 100_000_000),
      ownerKey: input.ownerKey ?? null,
      serviceFeeSats: input.ownerKey ? await serviceFeeSats() : 0,
    });
    const txid = await rpc<string>("sendrawtransaction", [hex]);
    return { ok: true, txid, address };
  } catch (seedError) {
    // The user funds their own anchors: never quietly spend the house wallet.
    if (input.ownerKey) return { ok: false, error: (seedError as Error).message };
    // Fall through to the node wallet rather than lose the anchor.
    try {
      const outputs: Record<string, unknown> = { data };
      if (address) outputs[address] = DUST_TXC;
      const raw = await rpc<string>("createrawtransaction", [[], outputs]);
      const funded = await rpc<{ hex: string }>("fundrawtransaction", [raw]);
      const signed = await rpc<{ hex: string; complete: boolean }>("signrawtransactionwithwallet", [funded.hex]);
      if (!signed.complete) return { ok: false, error: "Node could not sign the anchor transaction." };
      const txid = await rpc<string>("sendrawtransaction", [signed.hex]);
      return { ok: true, txid, address };
    } catch (nodeError) {
      const seedMsg = (seedError as Error).message;
      const nodeMsg = (nodeError as Error).message;
      return { ok: false, error: `Seed signing failed (${seedMsg}); node wallet failed (${nodeMsg}).` };
    }
  }
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Health read for an anchoring budget: address, balance and runway. */
export async function anchorWalletStatus(ownerKey?: string | null) {
  const { anchorWalletBalance, ANCHOR_COST_SATS } = await import("./txcWallet.server");
  const fee = ownerKey ? await serviceFeeSats() : 0;
  return anchorWalletBalance(rpc, ownerKey ?? null, ANCHOR_COST_SATS + fee);
}

/**
 * Total cost of one anchor in TXC: network fee + the asset's dust inbox +
 * the BEVIS service fee.
 */
export async function anchorCostTxc(withServiceFee = true) {
  const { ANCHOR_COST_SATS, SATS_PER_TXC } = await import("./txcWallet.server");
  const fee = withServiceFee ? await serviceFeeSats() : 0;
  return (ANCHOR_COST_SATS + fee) / SATS_PER_TXC;
}

/** The service fee expressed in TXC at the current price (0 if unpriced). */
export async function serviceFeeTxc() {
  const { SATS_PER_TXC } = await import("./txcWallet.server");
  return (await serviceFeeSats()) / SATS_PER_TXC;
}

/** True when this owner's own address can pay for at least one more anchor. */
export async function hasFuel(ownerKey: string) {
  const status = await anchorWalletStatus(ownerKey);
  return { ...status, funded: status.anchorsRemaining > 0 };
}

/** Back-compat helper: anchor a bare fingerprint with no manifest or address. */
export async function anchorSha256(sha256Hex: string): Promise<AnchorResult> {
  return anchorBevis({ sha256Hex });
}


