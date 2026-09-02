/**
 * Unified USD price service.
 * Primary: CoinMarketCap (CMC_API_KEY).  Fallback: CoinGecko (no key).
 * In-memory 60s cache so a portfolio render only fans out once.
 *
 * Server-only — imported from server function handlers via dynamic import.
 */

import type { ChainId } from "./chains";

// CMC symbol per chain. Omitted chains fall back to CoinGecko id.
const CMC_SYMBOLS: Partial<Record<ChainId, string>> = {
  btc: "BTC",
  eth: "ETH",
  ltc: "LTC",
  doge: "DOGE",
  bch: "BCH",
  bsc: "BNB",
  bnb: "BNB",
  ada: "ADA",
  sol: "SOL",
};

/**
 * CMC numeric asset ids — preferred over symbols for small caps where the
 * ticker is ambiguous (TEXITcoin is CMC id 32744).
 */
const CMC_IDS: Partial<Record<ChainId, number>> = {
  txc: 32744,
};

const CG_IDS: Partial<Record<ChainId, string>> = {
  btc: "bitcoin",
  eth: "ethereum",
  ltc: "litecoin",
  doge: "dogecoin",
  bch: "bitcoin-cash",
  bsc: "binancecoin",
  bnb: "binancecoin",
  ada: "cardano",
  sol: "solana",
  txc: "texitcoin",
};

type CacheEntry = { price: number | null; expires: number };
const cache = new Map<ChainId, CacheEntry>();
const TTL_MS = 60_000;
/** A failed lookup is retried quickly; only real prices are cached for long. */
const MISS_TTL_MS = 5_000;

/** The key has been stored under both names over time; accept either. */
function cmcKey(): string | undefined {
  return process.env.CMC_API_KEY || process.env.CMC_API || undefined;
}

let cmcInflight: Promise<Map<string, number>> | null = null;
let cmcIdInflight: Promise<Map<number, number>> | null = null;

async function fetchCmcBatch(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const key = cmcKey();
  if (!key || symbols.length === 0) return out;
  try {
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}&convert=USD`;
    const res = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": key, accept: "application/json" } });
    if (!res.ok) return out;
    const json = (await res.json()) as {
      data?: Record<string, Array<{ quote?: { USD?: { price?: number } } }>>;
    };
    for (const [sym, arr] of Object.entries(json.data ?? {})) {
      const p = arr?.[0]?.quote?.USD?.price;
      if (typeof p === "number") out.set(sym.toUpperCase(), p);
    }
  } catch {
    /* fall through to CoinGecko */
  }
  return out;
}

async function fetchCmcByIds(ids: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const key = cmcKey();
  if (!key || ids.length === 0) return out;
  try {
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${ids.join(",")}&convert=USD`;
    const res = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": key, accept: "application/json" } });
    if (!res.ok) return out;
    const json = (await res.json()) as {
      data?: Record<string, { quote?: { USD?: { price?: number } } }>;
    };
    for (const [id, v] of Object.entries(json.data ?? {})) {
      const p = v?.quote?.USD?.price;
      if (typeof p === "number") out.set(Number(id), p);
    }
  } catch {
    /* fall through to CoinGecko */
  }
  return out;
}

async function fetchCoinGecko(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return out;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    for (const [id, v] of Object.entries(data)) {
      if (typeof v.usd === "number") out.set(id, v.usd);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * ISK price — source of truth is the wISK pool oracle on Ethereum mainnet.
 * 30m TWAP (settlement-safe); the endpoint falls back to spot itself.
 */
async function fetchIskUsd(): Promise<number | null> {
  try {
    const res = await fetch("https://wisk.iskandercoin.com/api/public/price?twap=30m", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { usd?: number };
    return typeof j.usd === "number" && isFinite(j.usd) ? j.usd : null;
  } catch {
    return null;
  }
}

/** Resolve USD price for a single chain (cached, batched). */
export async function priceUsd(chain: ChainId): Promise<number | null> {
  const now = Date.now();
  const hit = cache.get(chain);
  if (hit && hit.expires > now) return hit.price;

  if (chain === "iskander") {
    const price = await fetchIskUsd();
    cache.set(chain, { price, expires: now + TTL_MS });
    return price;
  }



  const trackedChains = Array.from(
    new Set([...Object.keys(CMC_SYMBOLS), ...Object.keys(CMC_IDS)]),
  ) as ChainId[];

  // Batch all chains we know about in one CMC call to amortize the key spend.
  if (!cmcInflight) {
    const symbols = trackedChains.map(c => CMC_SYMBOLS[c]!).filter(Boolean);
    cmcInflight = fetchCmcBatch(symbols);
    // Clear after this microtask batch.
    queueMicrotask(() => { cmcInflight = null; });
  }
  if (!cmcIdInflight) {
    const ids = trackedChains.map(c => CMC_IDS[c]!).filter(Boolean);
    cmcIdInflight = fetchCmcByIds(ids);
    queueMicrotask(() => { cmcIdInflight = null; });
  }
  const [cmc, cmcById] = await Promise.all([cmcInflight, cmcIdInflight]);

  // Anything CMC didn't return → try CoinGecko in one batched call.
  const missing: ChainId[] = [];
  for (const c of trackedChains) {
    const sym = CMC_SYMBOLS[c];
    const cmcId = CMC_IDS[c];
    if (sym && cmc.has(sym)) continue;
    if (cmcId && cmcById.has(cmcId)) continue;
    if (CG_IDS[c]) missing.push(c);
  }
  const cg = missing.length ? await fetchCoinGecko(missing.map(c => CG_IDS[c]!)) : new Map();

  // Hydrate cache for every chain we tried, so subsequent calls hit cache.
  for (const c of trackedChains) {
    const sym = CMC_SYMBOLS[c];
    const cmcId = CMC_IDS[c];
    const id = CG_IDS[c];
    const price =
      (cmcId ? cmcById.get(cmcId) : undefined) ??
      (sym ? cmc.get(sym) : undefined) ??
      (id ? cg.get(id) ?? null : null);
    // Never cache a miss for long — a rate-limited lookup must not wedge
    // pricing (and with it, paid top-ups) for a whole minute.
    cache.set(c, { price, expires: now + (price === null ? MISS_TTL_MS : TTL_MS) });
  }

  const batched = cache.get(chain)?.price ?? null;
  if (batched !== null) return batched;

  // Last resort: ask CoinGecko for this one coin on its own, with a retry.
  const id = CG_IDS[chain];
  if (!id) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const single = await fetchCoinGecko([id]);
    const price = single.get(id) ?? null;
    if (price !== null) {
      cache.set(chain, { price, expires: Date.now() + TTL_MS });
      return price;
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 400));
  }
  return null;
}
