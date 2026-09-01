/**
 * The chain ledger reader.
 *
 * A BEVIS asset address is a read-only inbox. Every notarisation ever made
 * for that asset paid it a dust output and carried an OP_RETURN naming the
 * IPFS content. So the address itself — not our database — is the record.
 * This module reads the address back off the chain and reconstructs the whole
 * history, including records made by the old system before this backend
 * existed.
 *
 * Two on-chain marker formats are understood:
 *
 *   legacy:  Bevis.<kk>.<cid>.<ref>.<checksum>     e.g. Bevis.20.Qm…4.629fc.f4f835c8
 *   current: BEVIS1<manifest-cid>
 *
 * In the legacy form `<kk>` is a coarse content code (00 certificate,
 * 10 image, 20 document) and the trailing fields are the record reference and
 * a short integrity check. In the current form the CID resolves to a JSON
 * manifest that carries the file name, SHA-256 and all declared metadata.
 *
 * Chain and Omni layer 2 docs: https://texitcoin.org/build
 */

export type LedgerEntryKind = "certificate" | "image" | "document" | "data" | "unknown";

export type ChainLedgerEntry = {
  txid: string;
  blockHeight: number | null;
  /** ISO timestamp of the block, when confirmed. */
  timestamp: string | null;
  confirmed: boolean;
  format: "bevis1" | "legacy" | "unrecognised";
  /** Raw OP_RETURN text, always kept so nothing on chain is hidden from view. */
  raw: string;
  cid: string | null;
  /** Legacy record reference (the 5-char field) when present. */
  ref: string | null;
  /** Legacy short checksum when present. */
  checksum: string | null;
  kind: LedgerEntryKind;
  /** Human title: manifest file name where known, otherwise a typed label. */
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** Gateway URL for the CID. */
  url: string | null;
  /** For current-format records: the manifest itself, when it could be read. */
  manifest: Record<string, unknown> | null;
  /** Fingerprint of the underlying file, when the manifest declares one. */
  sha256: string | null;
  /** Anything the publisher declared alongside the file. */
  metadata: Record<string, unknown> | null;
};

export type ChainLedger = {
  address: string;
  /** Total transactions seen on the address. */
  txCount: number;
  /** Total dust received, in TXC. */
  receivedTxc: number;
  entries: ChainLedgerEntry[];
  /** Set when the chain could not be reached; entries will be empty. */
  error: string | null;
};

const KIND_BY_CODE: Record<string, LedgerEntryKind> = {
  "00": "certificate",
  "10": "image",
  "20": "document",
  "30": "data",
};

const LABEL: Record<LedgerEntryKind, string> = {
  certificate: "Certificate",
  image: "Photo",
  document: "Document",
  data: "Data record",
  unknown: "Record",
};

function apiBases(): string[] {
  const clean = (v?: string) => (v ?? "").trim().replace(/\/+$/, "");
  const mempool = clean(process.env["TXC_MEMPOOL"]);
  const explorer = clean(process.env["TXC_EXPLORER"]);
  return [mempool && `${mempool}/api`, explorer && `${explorer}/api`].filter(Boolean) as string[];
}

/** Public block-explorer page for a transaction. */
export function explorerTxUrl(txid: string): string {
  const base = (process.env["TXC_EXPLORER"] ?? "https://explorer.texitcoin.org").trim().replace(/\/+$/, "");
  return `${base}/tx/${txid}`;
}

/** Public block-explorer page for an address. */
export function explorerAddressUrl(address: string): string {
  const base = (process.env["TXC_EXPLORER"] ?? "https://explorer.texitcoin.org").trim().replace(/\/+$/, "");
  return `${base}/address/${address}`;
}

function gateway(cid: string): string {
  const gw = (process.env["PINATA_GW"] ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return gw ? `https://${gw}/ipfs/${cid}` : `https://gateway.pinata.cloud/ipfs/${cid}`;
}

type EsploraTx = {
  txid: string;
  status?: { confirmed?: boolean; block_height?: number; block_time?: number };
  vout?: Array<{
    scriptpubkey?: string;
    scriptpubkey_type?: string;
    scriptpubkey_address?: string;
    value?: number;
  }>;
};

async function getJson<T>(url: string, ms = 15_000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Pull the OP_RETURN payload out of a nulldata script, minus the push opcodes. */
function readNulldata(scriptHex: string): string | null {
  try {
    const bytes = new Uint8Array((scriptHex.match(/../g) ?? []).map(h => parseInt(h, 16)));
    if (bytes[0] !== 0x6a) return null;
    let i = 1;
    let len = bytes[i] ?? 0;
    if (len === 0x4c) {
      i += 1;
      len = bytes[i] ?? 0;
    }
    i += 1;
    const slice = bytes.slice(i, i + len);
    return new TextDecoder().decode(slice);
  } catch {
    return null;
  }
}

const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/;

/** Parse one OP_RETURN string into the fields a BEVIS record carries. */
export function parseMarker(raw: string): Pick<ChainLedgerEntry, "format" | "cid" | "ref" | "checksum" | "kind"> {
  const text = raw.trim();

  if (/^BEVIS1/.test(text)) {
    const cid = text.slice(6).trim();
    return { format: "bevis1", cid: CID_RE.test(cid) ? cid : null, ref: null, checksum: null, kind: "unknown" };
  }

  if (/^bevis\./i.test(text)) {
    const parts = text.split(".");
    // Bevis . kk . cid . ref . checksum
    const code = parts[1] ?? "";
    const cid = parts[2] ?? "";
    return {
      format: "legacy",
      cid: CID_RE.test(cid) ? cid : null,
      ref: parts[3] ?? null,
      checksum: parts[4] ?? null,
      kind: KIND_BY_CODE[code] ?? "unknown",
    };
  }

  return { format: "unrecognised", cid: null, ref: null, checksum: null, kind: "unknown" };
}

function kindFromMime(mime: string | null): LedgerEntryKind {
  if (!mime) return "unknown";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("officedocument")) return "document";
  if (mime.includes("html")) return "certificate";
  if (mime.includes("json") || mime.includes("text/")) return "data";
  return "unknown";
}

/** Run tasks with a small concurrency cap so a busy asset can't stall the page. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Ask the gateway what a CID actually is, without downloading it. */
async function probe(cid: string): Promise<{ mimeType: string | null; sizeBytes: number | null }> {
  try {
    const res = await fetch(gateway(cid), { method: "HEAD", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return { mimeType: null, sizeBytes: null };
    const len = res.headers.get("content-length");
    return {
      mimeType: (res.headers.get("content-type") ?? "").split(";")[0]?.trim() || null,
      sizeBytes: len ? Number(len) : null,
    };
  } catch {
    return { mimeType: null, sizeBytes: null };
  }
}

async function readManifest(cid: string): Promise<Record<string, unknown> | null> {
  return getJson<Record<string, unknown>>(gateway(cid), 12_000);
}

/**
 * Read every BEVIS record ever stamped onto an address.
 *
 * Best-effort throughout: an unreachable node or gateway degrades the detail
 * on an entry, it never drops the entry or throws.
 */
export async function readChainLedger(address: string, opts?: { limit?: number }): Promise<ChainLedger> {
  const limit = opts?.limit ?? 200;
  const bases = apiBases();

  let txs: EsploraTx[] | null = null;
  let stats: { chain_stats?: { tx_count?: number; funded_txo_sum?: number } } | null = null;

  for (const base of bases) {
    txs = await getJson<EsploraTx[]>(`${base}/address/${address}/txs`, 20_000);
    if (txs) {
      stats = await getJson(`${base}/address/${address}`, 10_000);
      break;
    }
  }

  if (!txs) {
    return {
      address,
      txCount: 0,
      receivedTxc: 0,
      entries: [],
      error: "The TEXITcoin explorer could not be reached just now.",
    };
  }

  const rows: Array<{ tx: EsploraTx; raw: string }> = [];
  for (const tx of txs) {
    for (const out of tx.vout ?? []) {
      if (out.scriptpubkey_type !== "nulldata" && out.scriptpubkey_type !== "op_return") continue;
      const raw = readNulldata(out.scriptpubkey ?? "");
      if (raw) rows.push({ tx, raw });
    }
  }

  const capped = rows.slice(0, limit);

  const entries = await mapLimit(capped, 6, async ({ tx, raw }): Promise<ChainLedgerEntry> => {
    const parsed = parseMarker(raw);
    const base: ChainLedgerEntry = {
      txid: tx.txid,
      blockHeight: tx.status?.block_height ?? null,
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
      confirmed: tx.status?.confirmed !== false,
      ...parsed,
      raw,
      title: LABEL[parsed.kind],
      mimeType: null,
      sizeBytes: null,
      url: parsed.cid ? gateway(parsed.cid) : null,
      manifest: null,
      sha256: null,
      metadata: null,
    };

    if (!parsed.cid) return base;

    if (parsed.format === "bevis1") {
      const manifest = await readManifest(parsed.cid);
      if (manifest) {
        const file = (manifest["file"] ?? {}) as Record<string, unknown>;
        const mime = typeof file["mimeType"] === "string" ? (file["mimeType"] as string) : null;
        const fileCid = typeof file["cid"] === "string" ? (file["cid"] as string) : null;
        return {
          ...base,
          manifest,
          title: typeof file["name"] === "string" && file["name"] ? (file["name"] as string) : LABEL[kindFromMime(mime)],
          mimeType: mime,
          sizeBytes: typeof file["sizeBytes"] === "number" ? (file["sizeBytes"] as number) : null,
          sha256: typeof file["sha256"] === "string" ? (file["sha256"] as string) : null,
          kind: kindFromMime(mime),
          metadata: (manifest["metadata"] ?? null) as Record<string, unknown> | null,
          url: fileCid ? gateway(fileCid) : base.url,
        };
      }
      return base;
    }

    const info = await probe(parsed.cid);
    const kind = parsed.kind === "unknown" ? kindFromMime(info.mimeType) : parsed.kind;
    return { ...base, ...info, kind, title: LABEL[kind] };
  });

  entries.sort((a, b) => (b.blockHeight ?? 0) - (a.blockHeight ?? 0));

  return {
    address,
    txCount: stats?.chain_stats?.tx_count ?? txs.length,
    receivedTxc: (stats?.chain_stats?.funded_txo_sum ?? 0) / 100_000_000,
    entries,
    error: null,
  };
}
