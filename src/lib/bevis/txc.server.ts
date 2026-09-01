/**
 * TEXITcoin anchoring for BEVIS.
 *
 * A BEVIS notarisation is an OP_RETURN output carrying a 38-byte payload:
 *
 *   "BEVIS1" (6 bytes ASCII) || sha256 of the document (32 bytes)
 *
 * We build it through the TXC node's wallet RPC: create a raw transaction
 * with the data output, let the node fund it, sign it, and broadcast. If the
 * node is unreachable or unfunded the caller records the file as `pending`
 * rather than failing the whole publish — the fingerprint is already stored
 * and can be re-anchored later.
 *
 * Docs for the chain and the Omni layer 2: https://texitcoin.org/build
 */

const PREFIX = "BEVIS1";

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

/** The hex data payload stamped into the OP_RETURN output. */
export function anchorPayloadHex(sha256Hex: string): string {
  const prefix = [...PREFIX].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  return prefix + sha256Hex.toLowerCase();
}

export type AnchorResult =
  | { ok: true; txid: string }
  | { ok: false; error: string };

/**
 * Broadcast the OP_RETURN anchor. Never throws — anchoring is best-effort so
 * a node outage can't lose the user's notarisation record.
 */
export async function anchorSha256(sha256Hex: string): Promise<AnchorResult> {
  try {
    const data = anchorPayloadHex(sha256Hex);
    const raw = await rpc<string>("createrawtransaction", [[], { data }]);
    const funded = await rpc<{ hex: string }>("fundrawtransaction", [raw]);
    const signed = await rpc<{ hex: string; complete: boolean; errors?: unknown }>(
      "signrawtransactionwithwallet",
      [funded.hex],
    );
    if (!signed.complete) return { ok: false, error: "Node could not sign the anchor transaction." };
    const txid = await rpc<string>("sendrawtransaction", [signed.hex]);
    return { ok: true, txid };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "TXC anchoring unavailable." };
  }
}
