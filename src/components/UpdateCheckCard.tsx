/**
 * Update card for sideloaded Android installs.
 *
 * Asks the published release feed on mount, compares it with the version this
 * device actually has installed, and — when a newer build exists — offers one
 * Install button. Hidden on the web, where users are always current.
 */
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Copy, Check } from "lucide-react";
import {
  APP_VERSION,
  compareVersions,
  currentPlatform,
  fetchLatestRelease,
  installedVersion,
  ipfsUrl,
  openDownload,
  releaseDownloadUrl,
  type AppRelease,
  type ReleasePlatform,
} from "@/lib/app-release";

type Status = "checking" | "current" | "update" | "unknown";

export function UpdateCheckCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [latest, setLatest] = useState<AppRelease | null>(null);
  const [installed, setInstalled] = useState(APP_VERSION);
  const [platform, setPlatform] = useState<ReleasePlatform>("web");
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    setStatus("checking");
    const plat = await currentPlatform();
    setPlatform(plat);
    const current = await installedVersion();
    setInstalled(current);

    const rel = await fetchLatestRelease(plat === "web" ? "android" : plat);
    setLatest(rel);
    if (!rel) return setStatus("unknown");
    setStatus(compareVersions(rel.version, current) > 0 ? "update" : "current");
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (platform === "web") return null;

  const downloadUrl = releaseDownloadUrl(latest);
  const cid = ipfsUrl(latest);
  const newer = !!latest && compareVersions(latest.version, installed) > 0;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            App version
          </p>
          <p className="mt-1 text-sm text-foreground">
            {`Installed ${installed} · ${platform}`}
            {latest ? ` · latest ${latest.version}` : ""}
          </p>
        </div>
        <button
          aria-label="Check for updates"
          onClick={() => void check()}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40"
        >
          <RefreshCw className={`size-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
        </button>
      </div>

      {status === "update" && newer && latest && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Version {latest.version}</span> is available
            {latest.mandatory ? " — required update." : "."}
          </p>
          {latest.notes && <p className="text-xs text-muted-foreground">{latest.notes}</p>}

          {platform === "ios" ? (
            <p className="text-xs text-muted-foreground">iOS updates arrive through the App Store.</p>
          ) : (
            <>
              <button
                onClick={() => void openDownload(downloadUrl)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="size-4" /> Install {latest.version}
              </button>
              <p className="text-[11px] text-muted-foreground">
                This opens your browser to download the file. When it finishes, tap the download and
                confirm “Update”. Your records stay exactly as they are.
              </p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(downloadUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy download
                link
              </button>
              {cid && (
                <p className="break-all text-[10px] text-muted-foreground">
                  IPFS: <span className="font-mono">{latest.ipfs_cid}</span>
                </p>
              )}
              {latest.sha256 && (
                <p className="break-all text-[10px] text-muted-foreground">
                  SHA-256: <span className="font-mono">{latest.sha256}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {status === "current" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {`You're on the latest version${latest ? ` (${latest.version})` : ""}.`}
        </p>
      )}

      {status === "unknown" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Couldn&apos;t reach the update server. Check your connection and try again.
        </p>
      )}
    </section>
  );
}
