import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FileUp, Camera, Video, Mic, ShieldCheck, ShieldOff, Loader2, CheckCircle2,
  AlertTriangle, FileText, Image as ImageIcon, FileAudio, FileVideo, MapPin, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { inspectFile, requestLocation, fileKind, type BevisFileMetadata } from "@/lib/bevis/metadata";
import { uploadAndPublish, type PublishOutcome } from "@/lib/bevis/publish";
import { publishBevisFile } from "@/lib/bevis.functions";
import { guestPublishBevisFile } from "@/lib/bevisGuest.functions";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/publish")({
  // `?assetId=ABC123` arrives from an asset's record book: file another record
  // against a record that already exists.
  validateSearch: (search: Record<string, unknown>): { assetId?: string } =>
    typeof search["assetId"] === "string" ? { assetId: search["assetId"].toUpperCase() } : {},
  head: () => ({
    meta: [
      { title: "Create a record — BEVIS" },
      {
        name: "description",
        content:
          "Capture or choose a file, review its detected metadata, encrypt it if you want, and stamp its fingerprint onto the TEXITcoin blockchain.",
      },
      { property: "og:title", content: "Create a record — BEVIS" },
      {
        property: "og:description",
        content: "Blockchain-enabled Verification & Information Service: a digital notary for any file.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublishPage,
});

type Stage = "pick" | "review" | "working" | "done";

const KIND_ICON = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  document: FileText,
} as const;

function PublishPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const publishFn = useServerFn(publishBevisFile);
  const guestPublishFn = useServerFn(guestPublishBevisFile);

  const [stage, setStage] = useState<Stage>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [meta, setMeta] = useState<BevisFileMetadata | null>(null);
  const [assetName, setAssetName] = useState("");
  const [appendTo, setAppendTo] = useState(Route.useSearch().assetId ?? "");
  const [encrypt, setEncrypt] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [step, setStep] = useState("");
  const [result, setResult] = useState<PublishOutcome | null>(null);

  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setAssetName(f.name);
    setStage("review");
    setMeta(null);
    const buf = await f.arrayBuffer();
    setBytes(buf);
    setMeta(await inspectFile(f, buf));
  }, []);

  async function attachLocation() {
    const gps = await requestLocation();
    if (!gps) {
      toast.error("Location unavailable or denied.");
      return;
    }
    setMeta(m => (m ? { ...m, gps } : m));
    toast.success("Location attached to the record.");
  }

  async function publish() {
    if (!file || !bytes || !meta) return;
    setStage("working");
    try {
      const outcome = await uploadAndPublish(
        publishFn as unknown as (a: { data: Record<string, unknown> }) => Promise<PublishOutcome>,
        {
          file,
          bytes,
          metadata: meta,
          encrypt,
          passphrase,
          assetId: appendTo.trim() ? appendTo.trim().toUpperCase() : null,
          assetName: assetName.trim() || file.name,
          onStep: setStep,
        },
        user ? undefined : (guestPublishFn as unknown as (a: { data: Record<string, unknown> }) => Promise<PublishOutcome>),
      );
      setResult(outcome);
      setStage("done");
    } catch (e) {
      toast.error((e as Error).message);
      setStage("review");
    }
  }

  function reset() {
    setFile(null);
    setBytes(null);
    setMeta(null);
    setResult(null);
    setPassphrase("");
    setEncrypt(false);
    setAppendTo("");
    setStage("pick");
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">BEVIS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create a record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Its fingerprint gets stamped onto the TEXITcoin chain. The proof is permanent; the file stays yours.
        </p>
      </header>

      {stage === "pick" && (
        <SourceGrid
          onSelect={kind => {
            const map = { file: pickRef, photo: cameraRef, video: videoRef, audio: audioRef } as const;
            map[kind].current?.click();
          }}
        />
      )}

      <input ref={pickRef} type="file" hidden onChange={e => void onFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => void onFile(e.target.files?.[0])} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={e => void onFile(e.target.files?.[0])} />
      <input ref={audioRef} type="file" accept="audio/*" capture hidden onChange={e => void onFile(e.target.files?.[0])} />

      {stage === "review" && file && (
        <div className="space-y-5">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Choose a different file
          </button>

          <FileCard file={file} meta={meta} />

          {meta && (
            <>
              <MetadataTable meta={meta} />

              <button
                onClick={() => void attachLocation()}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
              >
                <MapPin className="size-3.5" />
                {meta.gps ? "Location attached" : "Attach my location"}
              </button>

              <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {encrypt ? <ShieldCheck className="size-4 text-primary" /> : <ShieldOff className="size-4 text-muted-foreground" />}
                      Encrypt this file
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Encryption happens on this device. We store only ciphertext — lose the passphrase and the file
                      is gone. The chain proof works either way.
                    </p>
                  </div>
                  <Switch checked={encrypt} onCheckedChange={setEncrypt} aria-label="Encrypt this file" />
                </div>
                {encrypt && (
                  <div className="mt-3">
                    <Label htmlFor="passphrase" className="text-xs">Passphrase</Label>
                    <Input
                      id="passphrase"
                      type="password"
                      autoComplete="new-password"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                      placeholder="At least 8 characters"
                      className="mt-1"
                    />
                  </div>
                )}
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <Label htmlFor="assetName" className="text-xs">Record name</Label>
                  <Input id="assetName" value={assetName} onChange={e => setAssetName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="appendTo" className="text-xs">Add to an existing Asset ID (optional)</Label>
                  <Input
                    id="appendTo"
                    value={appendTo}
                    onChange={e => setAppendTo(e.target.value.toUpperCase())}
                    placeholder="Leave blank to mint a new asset"
                    maxLength={6}
                    className="mt-1 font-mono uppercase"
                  />
                </div>
              </section>

              <button
                onClick={() => void publish()}
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Publish to TEXITcoin
              </button>
            </>
          )}

          {!meta && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading the file…
            </p>
          )}
        </div>
      )}

      {stage === "working" && (
        <div className="grid place-items-center py-20 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">{step || "Working…"}</p>
        </div>
      )}

      {stage === "done" && result && (
        <Receipt result={result} onAnother={reset} />
      )}
    </div>
  );
}

function SourceGrid({ onSelect }: { onSelect: (k: "file" | "photo" | "video" | "audio") => void }) {
  const items = [
    { k: "photo", label: "Take a photo", Icon: Camera },
    { k: "video", label: "Record video", Icon: Video },
    { k: "audio", label: "Record audio", Icon: Mic },
    { k: "file", label: "Choose a file", Icon: FileUp },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ k, label, Icon }) => (
        <button
          key={k}
          onClick={() => onSelect(k)}
          className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card transition-colors hover:border-primary/60 hover:bg-secondary"
        >
          <Icon className="size-7 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

function FileCard({ file, meta }: { file: File; meta: BevisFileMetadata | null }) {
  const kind = fileKind(file.type || "", file.name);
  const Icon = KIND_ICON[kind];
  const preview = kind === "image" ? URL.createObjectURL(file) : null;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      {preview ? (
        <img src={preview} alt={file.name} className="size-16 rounded-lg object-cover" />
      ) : (
        <div className="grid size-16 place-items-center rounded-lg bg-secondary">
          <Icon className="size-7 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {meta ? `${meta.sizeLabel} · ${meta.fileType}` : "Reading…"}
        </p>
      </div>
    </div>
  );
}

function MetadataTable({ meta }: { meta: BevisFileMetadata }) {
  const rows: Array<[string, string | null]> = [
    ["Document ID", meta.documentId],
    ["SHA-256", meta.sha256],
    ["Type", meta.fileType],
    ["Size", meta.sizeLabel],
    ["Resolution", meta.resolution],
    ["Duration", meta.durationSeconds != null ? `${meta.durationSeconds}s` : null],
    ["Pages", meta.numberOfPages != null ? String(meta.numberOfPages) : null],
    ["Captured", new Date(meta.capturedAt).toLocaleString()],
    ["File modified", meta.lastModified ? new Date(meta.lastModified).toLocaleString() : null],
    ["Device", meta.device.platform],
    ["Screen", meta.device.screen],
    ["Time zone", meta.device.timezone],
    ["Location", meta.gps ? `${meta.gps.latitude}, ${meta.gps.longitude}` : null],
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Detected</h2>
      <dl className="mt-3 space-y-2">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 text-xs">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="break-all text-right font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Receipt({ result, onAnother }: { result: PublishOutcome; onAnother: () => void }) {
  const anchored = result.anchorStatus === "anchored";
  return (
    <div className="space-y-5 text-center">
      <div className="grid place-items-center pt-6">
        {anchored ? (
          <CheckCircle2 className="size-16 text-primary" />
        ) : (
          <AlertTriangle className="size-16 text-amber-500" />
        )}
      </div>
      <h2 className="text-xl font-semibold">{anchored ? "Notarised" : "Recorded — anchor pending"}</h2>
      <p className="text-sm text-muted-foreground">
        {anchored
          ? "The fingerprint is now on the TEXITcoin chain."
          : "The record and fingerprint are saved. The chain stamp will be retried."}
      </p>

      <dl className="space-y-2 rounded-xl border border-border bg-card p-4 text-left text-xs">
        <Row label="Asset ID" value={result.assetId} mono />
        <Row label="Public key" value={result.publicKey} mono />
        {result.manifestCid && <Row label="IPFS record" value={result.manifestCid} mono />}
        {result.fileCid && <Row label="IPFS file" value={result.fileCid} mono />}
        {result.txid && <Row label="Transaction" value={result.txid} mono />}
        {result.anchorError && <Row label="Note" value={result.anchorError} />}
      </dl>

      <div className="grid gap-2">
        <Link
          to="/asset/$assetId"
          params={{ assetId: result.assetId }}
          className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          View certificate
        </Link>
        <button onClick={onAnother} className="rounded-md border border-border px-4 py-3 text-sm font-semibold">
          Create another
        </button>
      </div>
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
