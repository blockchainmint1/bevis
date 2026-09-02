import { describe, expect, test } from "bun:test";
import { fetchUtxos } from "./txcWallet.server";

const ADDRESS = "Tck4jrbXqxrUXq5aNGEgppiiWsHYbqmmiZ";
const TXID_A = "a".repeat(64);
const TXID_B = "b".repeat(64);

describe("fetchUtxos", () => {
  test("uses and sorts indexed UTXOs without scanning the node", async () => {
    let rpcCalls = 0;
    const rpc = async <T>() => {
      rpcCalls += 1;
      return {} as T;
    };
    const fetcher: typeof fetch = async () =>
      Response.json([
        { txid: TXID_A, vout: 0, value: 100 },
        { txid: TXID_B, vout: 2, value: 500 },
      ]);

    await expect(fetchUtxos(rpc, ADDRESS, fetcher)).resolves.toEqual([
      { txid: TXID_B, vout: 2, sats: 500 },
      { txid: TXID_A, vout: 0, sats: 100 },
    ]);
    expect(rpcCalls).toBe(0);
  });

  test("falls back to the node when the index is unavailable", async () => {
    const calls: Array<{ method: string; params?: unknown[] }> = [];
    const rpc = async <T>(method: string, params?: unknown[]) => {
      calls.push({ method, params });
      return {
        unspents: [{ txid: TXID_A, vout: 1, amount: 0.25 }],
      } as T;
    };
    const fetcher: typeof fetch = async () => new Response("down", { status: 503 });

    await expect(fetchUtxos(rpc, ADDRESS, fetcher)).resolves.toEqual([
      { txid: TXID_A, vout: 1, sats: 25_000_000 },
    ]);
    expect(calls).toEqual([
      { method: "scantxoutset", params: ["start", [{ desc: `addr(${ADDRESS})` }]] },
    ]);
  });

  test("rejects malformed index data and uses the node fallback", async () => {
    let rpcCalls = 0;
    const rpc = async <T>() => {
      rpcCalls += 1;
      return { unspents: [] } as T;
    };
    const fetcher: typeof fetch = async () =>
      Response.json([{ txid: "not-a-txid", vout: -1, value: "100" }]);

    await expect(fetchUtxos(rpc, ADDRESS, fetcher)).resolves.toEqual([]);
    expect(rpcCalls).toBe(1);
  });
});