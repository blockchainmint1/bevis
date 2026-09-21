/**
 * Release / update plumbing for the sideloaded BEVIS Android build.
 *
 * APP_VERSION describes *this* web bundle. The live "what's the newest build?"
 * answer comes from the `app_releases` table via a fixed, key-free endpoint,
 * so a freshly pinned APK is visible to apps installed months ago without
 * shipping any new code to them.
 */

export const APP_VERSION = "1.0";

/**
 * Always download through our own endpoint, never the raw IPFS gateway: the
 * gateway serves a generic binary type and Chrome saves the file as ".zip",
 * which can't be tapped to install. /api/public/apk forces the Android
 * package MIME type and a real filename.
 */
export const APK_URL = "https://app.bevis.sg/api/public/apk";

export type ReleasePlatform = "android" | "ios" | "web";

export type AppRelease = {
  platform: string;
  version: string;
  version_code: number | null;
  ipfs_cid: string | null;
  download_url: string | null;
  sha256: string | null;
  size_bytes: number | null;
  notes: string | null;
  mandatory: boolean;
  released_at: string;
};

/** Fixed hosts every build (past, present, future) can ask. */
const RELEASE_FEED_HOSTS = ["https://app.bevis.sg", "https://bevis.sg"] as const;

const RELEASE_FEED_PATH = "/api/public/latest-release";

async function fetchFeed(base: string, platform: ReleasePlatform): Promise<AppRelease | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${base}${RELEASE_FEED_PATH}?platform=${platform}&_=${Date.now()}`, {
      cache: "no-store",
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { release?: AppRelease | null };
    return json?.release ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Newest published release for a platform, or null if nothing is reachable. */
export async function fetchLatestRelease(platform: ReleasePlatform): Promise<AppRelease | null> {
  const bases: string[] = [];
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    bases.push(window.location.origin);
  }
  for (const h of RELEASE_FEED_HOSTS) if (!bases.includes(h)) bases.push(h);

  for (const base of bases) {
    const rel = await fetchFeed(base, platform);
    if (rel) return rel;
  }
  return null;
}

/**
 * The version that actually matters on a phone.
 *
 * The shell loads its web content from the server, so APP_VERSION describes
 * the web bundle — not the installed APK. Ask Capacitor for the real one.
 */
export async function installedVersion(): Promise<string> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      if (info?.version) return info.version;
    }
  } catch {
    /* not native, or plugin unavailable */
  }
  return APP_VERSION;
}

export async function currentPlatform(): Promise<ReleasePlatform> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() === "ios" ? "ios" : "android";
    }
  } catch {
    /* web */
  }
  return "web";
}

/** Numeric-aware version compare: 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-+]/);
  const pb = b.split(/[.\-+]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number(pa[i] ?? 0);
    const nb = Number(pb[i] ?? 0);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      const sa = pa[i] ?? "";
      const sb = pb[i] ?? "";
      if (sa !== sb) return sa > sb ? 1 : -1;
      continue;
    }
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

/** Best download link for a release row — always our own endpoint. */
export function releaseDownloadUrl(_r: AppRelease | null): string {
  return APK_URL;
}

/** Direct IPFS link, for people who prefer to verify the pin themselves. */
export function ipfsUrl(r: AppRelease | null): string | null {
  return r?.ipfs_cid ? `https://gateway.pinata.cloud/ipfs/${r.ipfs_cid}` : null;
}

/** Hand a download link to the phone's real browser (not an in-app tab). */
export async function openDownload(url: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url, windowName: "_system" });
        return;
      } catch {
        /* fall through */
      }
    }
  } catch {
    /* web */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
