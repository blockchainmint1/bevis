/**
 * Public Android download page.
 *
 * BEVIS ships Android directly as a signed APK rather than through the Play
 * Store. This page is the canonical place to get it, shows the checksum and
 * IPFS pin so anyone can verify the file, and walks a first-time installer
 * through Android's "unknown apps" prompt.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { APK_URL, fetchLatestRelease, ipfsUrl, type AppRelease } from "@/lib/app-release";

export const Route = createFileRoute("/_site/android")({
  head: () => ({
    meta: [
      { title: "Download BEVIS for Android" },
      {
        name: "description",
        content:
          "Install the BEVIS Android app directly — notarise documents and verify records on the TEXITcoin chain. Signed APK, pinned to IPFS, checksum published.",
      },
      { property: "og:title", content: "Download BEVIS for Android" },
      {
        property: "og:description",
        content:
          "Signed APK, pinned to IPFS, checksum published. Install BEVIS directly on your Android phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AndroidDownloadPage,
});

function megabytes(n: number | null) {
  if (!n) return null;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AndroidDownloadPage() {
  const [rel, setRel] = useState<AppRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchLatestRelease("android").then((r) => {
      setRel(r);
      setLoading(false);
    });
  }, []);

  const cid = ipfsUrl(rel);

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Android
        </p>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Download the BEVIS app</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Installed directly from us — no store in the middle. The file is pinned to IPFS and its
          checksum is published below, so you can confirm you received exactly what we published.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking for the latest build…</p>
        ) : rel ? (
          <>
            <p className="text-sm text-foreground">
              <span className="font-semibold">Version {rel.version}</span>
              {megabytes(rel.size_bytes) ? ` · ${megabytes(rel.size_bytes)}` : ""} ·{" "}
              {new Date(rel.released_at).toLocaleDateString()}
            </p>
            {rel.notes && <p className="mt-2 text-xs text-muted-foreground">{rel.notes}</p>}
            <a
              href={APK_URL}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="size-4" /> Download APK
            </a>
            {rel.sha256 && (
              <p className="mt-3 break-all text-[10px] text-muted-foreground">
                SHA-256: <span className="font-mono">{rel.sha256}</span>
              </p>
            )}
            {cid && (
              <p className="mt-1 break-all text-[10px] text-muted-foreground">
                IPFS:{" "}
                <a href={cid} className="font-mono underline" rel="noreferrer noopener" target="_blank">
                  {rel.ipfs_cid}
                </a>
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No Android build has been published yet.</p>
        )}
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <div className="flex gap-3">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Tap the downloaded file. Android warns that it came from an unknown source — choose
            <strong className="text-foreground"> Settings</strong>, switch on
            <strong className="text-foreground"> Allow from this source</strong>, press back, then
            tap <strong className="text-foreground">Install</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Updates appear inside the app under Settings. Installing a newer build over the old one
            keeps you signed in and keeps your records untouched.
          </p>
        </div>
      </section>
    </div>
  );
}
