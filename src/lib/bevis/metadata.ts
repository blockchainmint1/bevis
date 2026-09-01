/**
 * BEVIS file inspection.
 *
 * Everything the app can learn about a chosen file WITHOUT uploading it:
 * fingerprint, type, size, image/video dimensions, media duration, PDF page
 * count, plus the capture context (device, browser, timestamp, and — only if
 * the user allows it — GPS).
 *
 * This mirrors the metadata set the original BEVIS mobile app collected.
 */

import { sha256Hex } from "./crypto";

export type BevisFileMetadata = {
  documentId: string;
  fileName: string;
  fileType: string;
  extension: string;
  sizeBytes: number;
  sizeLabel: string;
  sha256: string;
  capturedAt: string;
  lastModified: string | null;
  /** "1920 × 1080" for images/video, null otherwise. */
  resolution: string | null;
  /** Seconds, for audio/video. */
  durationSeconds: number | null;
  numberOfPages: number | null;
  device: {
    platform: string;
    userAgent: string;
    language: string;
    timezone: string;
    screen: string;
  };
  gps: { latitude: number; longitude: number; accuracy: number | null } | null;
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/** Category used to pick icons and preview treatment. */
export function fileKind(mime: string, name: string): "image" | "video" | "audio" | "pdf" | "document" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  return "document";
}

async function imageResolution(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(`${img.naturalWidth} × ${img.naturalHeight}`);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function mediaInfo(file: File, kind: "video" | "audio") {
  return new Promise<{ resolution: string | null; duration: number | null }>(resolve => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = Number.isFinite(el.duration) ? Math.round(el.duration * 100) / 100 : null;
      const resolution =
        kind === "video"
          ? `${(el as HTMLVideoElement).videoWidth} × ${(el as HTMLVideoElement).videoHeight}`
          : null;
      URL.revokeObjectURL(url);
      resolve({ resolution, duration });
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ resolution: null, duration: null });
    };
    el.src = url;
  });
}

/** Cheap page count: count "/Type /Page" objects in the raw PDF bytes. */
function pdfPageCount(bytes: ArrayBuffer): number | null {
  try {
    const text = new TextDecoder("latin1").decode(new Uint8Array(bytes));
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches?.length) return matches.length;
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map(m => Number(m[1]));
    return counts.length ? Math.max(...counts) : null;
  } catch {
    return null;
  }
}

/** Ask for GPS once, with a short timeout. Resolves null when denied. */
export function requestLocation(): Promise<BevisFileMetadata["gps"]> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ?? null,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/** Inspect a chosen file. Reads the bytes once and reuses them. */
export async function inspectFile(
  file: File,
  bytes: ArrayBuffer,
): Promise<BevisFileMetadata> {
  const mime = file.type || "application/octet-stream";
  const kind = fileKind(mime, file.name);

  let resolution: string | null = null;
  let durationSeconds: number | null = null;
  let numberOfPages: number | null = null;

  if (kind === "image") {
    resolution = await imageResolution(file);
    numberOfPages = 1;
  } else if (kind === "video" || kind === "audio") {
    const info = await mediaInfo(file, kind);
    resolution = info.resolution;
    durationSeconds = info.duration;
  } else if (kind === "pdf") {
    numberOfPages = pdfPageCount(bytes);
  }

  const sha256 = await sha256Hex(bytes);

  return {
    documentId: sha256.slice(0, 16).toUpperCase(),
    fileName: file.name,
    fileType: mime,
    extension: file.name.split(".").pop()?.toLowerCase() ?? "",
    sizeBytes: file.size,
    sizeLabel: formatBytes(file.size),
    sha256,
    capturedAt: new Date().toISOString(),
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    resolution,
    durationSeconds,
    numberOfPages,
    device: {
      platform: (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
        ?? navigator.platform
        ?? "unknown",
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${window.screen.width} × ${window.screen.height}`,
    },
    gps: null,
  };
}
