import { ipfsLink } from "@/lib/bevis/ipfsLink";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  ArrowLeft, ShieldCheck, Clock, Lock, Download, RefreshCw, Trash2, Pencil, ExternalLink, FileText,
} from "lucide-react";

import {
  getMyBevisAsset, retryAnchor, getBevisFileUrl, renameBevisAsset, deleteBevisAsset,
} from "@/lib/bevis.functions";
import { useAuth } from "@/hooks/use-auth";
import { getGuestBevisAsset } from "@/lib/bevisGuest.functions";
import { getDeviceId } from "@/lib/deviceId";
import { formatBytes } from "@/lib/bevis/metadata";
import { Input } from "@/components/ui/input";
import { ChainLedger } from "@/components/ChainLedger";

export const Route = createFileRoute("/_app/asset/$assetId")({
  head: ({ params }) => ({
    meta: [
      { title: `Asset ${params.assetId} — BEVIS certificate` },
      {
        name: "description",
        content: `Notary certificate for BEVIS asset ${params.assetId}: fingerprints, timestamps and TEXITcoin chain anchors.`,
      },
      { property: "og:title", content: `Asset ${params.assetId} — BEVIS certificate` },
      { property: "og:description", content: "Blockchain notary certificate issued by BEVIS." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssetDetailPage,
});

function AssetDetailPage() {
  const { assetId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getAsset = useServerFn(getMyBevisAsset);
  const getGuestAsset = useServerFn(getGuestBevisAsset);
  const retry = useServerFn(retryAnchor);
  const signUrl = useServerFn(getBevisFileUrl);
  const rename = useServerFn(renameBevisAsset);
  const remove = useServerFn(deleteBevisAsset);

  const [qr, setQr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bevis-asset", assetId, user?.id ?? "guest"],
    queryFn: () =>
      user
        ? getAsset({ data: { assetId } })
        : getGuestAsset({ data: { assetId, deviceId: getDeviceId() } }),
  });

  useEffect(() => {
    if (!data?.publicKey) return;
    void QRCode.toDataURL(data.publicKey, { margin: 1, width: 480 }).then(setQr);
  }, [data?.publicKey]);

  if (isLoading) return <p className="px-5 py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!data) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">No asset {assetId} on this account.</p>
        <Link to="/assets" className="mt-4 inline-block text-sm font-semibold text-primary">Back to assets</Link>
      </div>
    );
  }

  async function download(fileId: string) {
    try {
      const { url } = await signUrl({ data: { fileId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reAnchor(fileId: string) {
    const r = await retry({ data: { fileId } });
    if (r.ok) toast.success("Anchored to TEXITcoin.");
    else toast.error("error" in r ? r.error : "Anchor failed.");
    void qc.invalidateQueries({ queryKey: ["bevis-asset", assetId] });
  }

  async function saveName() {
    await rename({ data: { assetId, name: draftName.trim() } });
    setEditing(false);
    void qc.invalidateQueries({ queryKey: ["bevis-asset", assetId] });
    void qc.invalidateQueries({ queryKey: ["bevis-assets"] });
  }

  async function destroy() {
    if (!confirm("Delete this asset and all of its records? The chain anchors stay on chain forever.")) return;
    await remove({ data: { assetId } });
    void qc.invalidateQueries({ queryKey: ["bevis-assets"] });
    void navigate({ to: "/assets" });
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <Link to="/assets" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Assets
      </Link>

      <header className="mt-4">
        {editing ? (
          <div className="flex gap-2">
            <Input value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus />
            <button onClick={() => void saveName()} className="rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.name ?? "Untitled asset"}</h1>
            {user && (
              <button
                onClick={() => { setDraftName(data.name ?? ""); setEditing(true); }}
                className="mt-1 text-muted-foreground hover:text-foreground"
                aria-label="Rename asset"
              >
                <Pencil className="size-4" />
              </button>
            )}
          </div>
        )}
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Asset ID {data.assetId} · {data.chain.toUpperCase()}
        </p>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
        {qr && <img src={qr} alt={`QR code for BEVIS public key ${data.publicKey}`} className="mx-auto size-44 rounded-lg bg-white p-2" />}
        <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{data.publicKey}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Scan this to read every file published to this asset.
        </p>
        <Link
          to="/verify/$key"
          params={{ key: data.publicKey }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          Public certificate <ExternalLink className="size-3" />
        </Link>
      </section>

      <h2 className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Published files ({data.files.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {data.files.map(f => (
          <li key={f.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                {f.encrypted ? <Lock className="size-4 text-primary" /> : <FileText className="size-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{f.sha256}</p>
                <p className="mt-1.5 text-[11px]">
                  {f.anchorStatus === "anchored" ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <ShieldCheck className="size-3" /> Anchored
                      {f.anchorTxid && <span className="ml-1 break-all font-mono text-muted-foreground">{f.anchorTxid.slice(0, 20)}…</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Clock className="size-3" /> Anchor pending
                    </span>
                  )}
                </p>
                {f.manifestCid && (
                  <p className="mt-1 break-all text-[10px]">
                    <a
                      href={ipfsLink(f.manifestCid)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-primary underline underline-offset-2"
                    >
                      IPFS record {f.manifestCid.slice(0, 20)}…
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {user && (
              <button onClick={() => void download(f.id)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary">
                <Download className="size-3" /> Download
              </button>
              )}
              {user && f.anchorStatus !== "anchored" && (
                <button onClick={() => void reAnchor(f.id)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary">
                  <RefreshCw className="size-3" /> Retry anchor
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ChainLedger address={data.publicKey} assetId={data.assetId} />

      {!user && (
        <p className="mt-6 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          This record was created without an account. It's already stamped on the chain — sign in on this device to
          claim it, download the stored file, and keep it across devices.
        </p>
      )}

      <div className="mt-8 grid gap-2">
        {user && (
        <button onClick={() => void destroy()} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" /> Delete asset
        </button>
        )}
      </div>
    </div>
  );
}
