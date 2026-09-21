import { ipfsLink } from "@/lib/bevis/ipfsLink";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldQuestion, Clock, Lock, ArrowLeft } from "lucide-react";

import { lookupBevisRecord } from "@/lib/bevis.functions";
import { getAdminBaseUrl } from "@/lib/backend";
import { formatBytes } from "@/lib/bevis/metadata";
import { Footer } from "@/components/Footer";
import { ChainLedger } from "@/components/ChainLedger";

export const Route = createFileRoute("/verify/$key")({
  head: ({ params }) => ({
    meta: [
      { title: `BEVIS record ${params.key} — verification certificate` },
      {
        name: "description",
        content: `Public verification certificate for BEVIS record ${params.key}: file fingerprints, timestamps and TEXITcoin chain anchors.`,
      },
      { property: "og:title", content: `BEVIS record ${params.key}` },
      { property: "og:description", content: "Independently check a BEVIS notary record against the TEXITcoin blockchain." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicVerifyPage,
});

function PublicVerifyPage() {
  const { key } = Route.useParams();
  const lookup = useServerFn(lookupBevisRecord);

  const { data, isLoading } = useQuery({
    queryKey: ["bevis-public", key],
    queryFn: () => lookup({ data: { key, adminBase: getAdminBaseUrl() } }),
  });

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-16 pt-8">
      <Link to="/app/lookup" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Scan another
      </Link>

      {isLoading && <p className="py-20 text-center text-sm text-muted-foreground">Checking the record…</p>}

      {data && !data.found && (
        <div className="py-20 text-center">
          <ShieldQuestion className="mx-auto size-14 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">No BEVIS record found</h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{data.key}</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            We checked this app's records and the Cold Storage Coins registry — nothing has been notarised to
            this asset ID or public key.
          </p>
        </div>
      )}

      {data?.found && (
        <>
          <header className="mt-6 border-b border-border pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Verification certificate
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.name ?? "Notarised asset"}</h1>
            <dl className="mt-4 space-y-1.5 text-xs">
              <Row label="Asset ID" value={data.assetId} mono />
              <Row label="Public key" value={data.publicKey} mono />
              <Row label="Chain" value={data.chain.toUpperCase()} />
              {data.source === "bevis" && (
                <Row label="First notarised" value={new Date(data.createdAt).toLocaleString()} />
              )}
              {data.legacy?.cryptoCurrency && <Row label="Currency" value={data.legacy.cryptoCurrency} />}
              {data.legacy && (
                <Row label="Activated" value={data.legacy.activated ? "Yes" : "Not yet"} />
              )}
            </dl>
            {data.source === "legacy" && (
              <p className="mt-4 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                This record comes from the Cold Storage Coins registry — it was minted before this notary service
                existed. Files notarised from here on appear below.
              </p>
            )}
          </header>

          <h2 className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Notarised files ({data.files.length})
          </h2>

          {data.files.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No files have been notarised to this asset yet.
            </p>
          )}

          <ul className="mt-3 space-y-3">
            {data.files.map(f => (
              <li key={f.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(f.sizeBytes)}
                      {f.mimeType ? ` · ${f.mimeType}` : ""} · {new Date(f.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {f.encrypted && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-medium">
                      <Lock className="size-3" /> Encrypted
                    </span>
                  )}
                </div>

                <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">SHA-256 {f.sha256}</p>

                <p className="mt-2 text-[11px]">
                  {f.anchorStatus === "anchored" ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <ShieldCheck className="size-3" /> Anchored on TEXITcoin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Clock className="size-3" /> Anchor pending
                    </span>
                  )}
                </p>
                {f.anchorTxid && (
                  <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">TXID {f.anchorTxid}</p>
                )}
                {f.manifestCid && (
                  <p className="mt-0.5 break-all text-[10px]">
                    <a
                      href={ipfsLink(f.manifestCid)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-primary underline underline-offset-2"
                    >
                      IPFS record {f.manifestCid}
                    </a>
                  </p>
                )}
                {f.anchoredAt && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Stamped {new Date(f.anchoredAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <ChainLedger address={data.publicKey} />

          <p className="mt-8 text-xs text-muted-foreground">
            BEVIS stores the fingerprint, not your trust. Hash the original file yourself and compare it with the
            SHA-256 above — if they match, the file is byte-for-byte the one stamped onto the chain at that time.
          </p>
        </>
      )}

      <Footer />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`break-all text-right ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
