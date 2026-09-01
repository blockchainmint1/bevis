/**
 * The record book for one BEVIS asset address.
 *
 * Reads straight off TEXITcoin rather than our database, so records made by
 * the old system show up next to new ones, and anything anyone ever stamped
 * to this address is visible — sortable, searchable and openable.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown, ExternalLink, FileText, Image as ImageIcon, ScrollText, Database,
  Search, Plus, Link2, ChevronDown, ChevronRight, Loader2, AlertTriangle,
} from "lucide-react";

import { getChainLedger } from "@/lib/bevis.functions";
import { formatBytes } from "@/lib/bevis/metadata";

type Kind = "certificate" | "image" | "document" | "data" | "unknown";

const KIND_ICON: Record<Kind, typeof FileText> = {
  certificate: ScrollText,
  image: ImageIcon,
  document: FileText,
  data: Database,
  unknown: Link2,
};

const FILTERS: Array<{ id: Kind | "all"; label: string }> = [
  { id: "all", label: "Everything" },
  { id: "document", label: "Documents" },
  { id: "image", label: "Photos" },
  { id: "certificate", label: "Certificates" },
  { id: "data", label: "Data" },
];

export function ChainLedger({ address, assetId }: { address: string; assetId?: string | null }) {
  const read = useServerFn(getChainLedger);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chain-ledger", address],
    queryFn: () => read({ data: { address } }),
    staleTime: 60_000,
  });

  const entries = useMemo(() => {
    const all = data?.entries ?? [];
    const q = query.trim().toLowerCase();
    const filtered = all.filter(e => {
      if (kind !== "all" && e.kind !== kind) return false;
      if (!q) return true;
      return [e.title, e.raw, e.cid, e.txid, e.sha256, JSON.stringify(e.metadata ?? {})]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => {
      const av = a.blockHeight ?? 0;
      const bv = b.blockHeight ?? 0;
      return newestFirst ? bv - av : av - bv;
    });
  }, [data, query, kind, newestFirst]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of data?.entries ?? []) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [data]);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Record book
        </h2>
        {data && !data.error && (
          <a
            href={data.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            On chain <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Everything ever filed to this address, read back from TEXITcoin.
      </p>

      {isLoading && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading the chain…
        </p>
      )}

      {data?.error && (
        <p className="mt-4 inline-flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 text-amber-500" /> {data.error}
        </p>
      )}

      {data && !data.error && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Records" value={String(data.entries.length)} />
            <Stat label="Entries on chain" value={String(data.txCount)} />
            <Stat
              label="Kinds"
              value={String(Object.keys(counts).length || 0)}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search records, hashes, notes…"
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setNewestFirst(v => !v)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              <ArrowUpDown className="size-3.5" /> {newestFirst ? "Newest" : "Oldest"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTERS.map(f => {
              const n = f.id === "all" ? data.entries.length : counts[f.id] ?? 0;
              if (f.id !== "all" && n === 0) return null;
              return (
                <button
                  key={f.id}
                  onClick={() => setKind(f.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                    kind === f.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label} {n}
                </button>
              );
            })}
          </div>

          <ol className="mt-4 space-y-2">
            {entries.map(e => {
              const Icon = KIND_ICON[(e.kind as Kind) ?? "unknown"] ?? Link2;
              const isOpen = open === e.txid + e.raw;
              return (
                <li key={e.txid + e.raw} className="rounded-xl border border-border bg-card">
                  <button
                    onClick={() => setOpen(isOpen ? null : e.txid + e.raw)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                      <Icon className="size-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {e.timestamp ? new Date(e.timestamp).toLocaleString() : "Unconfirmed"}
                        {e.blockHeight ? ` · block ${e.blockHeight}` : ""}
                        {e.sizeBytes ? ` · ${formatBytes(e.sizeBytes)}` : ""}
                      </span>
                    </span>
                    {isOpen ? (
                      <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 py-3 text-[11px]">
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <dl className="mb-3 grid gap-1">
                          {Object.entries(e.metadata).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <dt className="w-28 shrink-0 capitalize text-muted-foreground">{k}</dt>
                              <dd className="min-w-0 flex-1 break-words">{String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <Field label="Filed as" value={e.raw} />
                      {e.mimeType && <Field label="Type" value={e.mimeType} />}
                      {e.sha256 && <Field label="Fingerprint" value={e.sha256} />}
                      {e.ref && <Field label="Reference" value={e.ref} />}
                      {e.cid && <Field label="IPFS" value={e.cid} />}
                      <Field label="Transaction" value={e.txid} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-medium hover:bg-secondary"
                          >
                            <ExternalLink className="size-3" /> Open
                          </a>
                        )}
                        <a
                          href={e.txUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-medium hover:bg-secondary"
                        >
                          <Link2 className="size-3" /> Chain proof
                        </a>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {entries.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {data.entries.length === 0
                ? "Nothing has been filed to this address yet."
                : "No records match that search."}
            </p>
          )}

          {assetId && (
            <Link
              to="/publish"
              search={{ assetId }}
              className="mt-4 flex items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-semibold hover:bg-secondary"
            >
              <Plus className="size-4" /> File another record
            </Link>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-all font-mono">{value}</span>
    </div>
  );
}
