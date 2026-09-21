/**
 * APK download endpoint with correct Android headers.
 *
 *   GET /api/public/apk
 *
 * Why we proxy instead of redirecting to IPFS: gateways serve the file as a
 * generic binary (an APK *is* a zip), so Chrome saves it as ".zip" and
 * tap-to-install breaks. We stream the same bytes and force the Android
 * package MIME type + filename, copying upstream's Content-Length verbatim so
 * the download manager can finish instead of hanging at 99%.
 */
import { createFileRoute } from "@tanstack/react-router";

const PINATA_GW = (process.env["PINATA_GW"] || "gateway.pinata.cloud")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
const IPFS_GATEWAY = `https://${PINATA_GW}/ipfs/`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, Content-Disposition, Accept-Ranges",
  "Access-Control-Max-Age": "86400",
} as const;

async function resolveSource(): Promise<{ url: string; filename: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_releases")
    .select("version, ipfs_cid, download_url")
    .eq("platform", "android")
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const filename = `bevis-${data.version}.apk`;
  if (data.ipfs_cid) {
    return {
      url: `${IPFS_GATEWAY}${data.ipfs_cid}?filename=${encodeURIComponent(filename)}&download=true`,
      filename,
    };
  }
  if (data.download_url) return { url: data.download_url, filename };
  return null;
}

function headers(length: string | null, filename: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "public, max-age=300",
    ...corsHeaders,
  };
  if (length) h["Content-Length"] = length;
  return h;
}

export const Route = createFileRoute("/api/public/apk")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      HEAD: async () => {
        const src = await resolveSource();
        if (!src) return new Response(null, { status: 404, headers: corsHeaders });
        const upstream = await fetch(src.url, { method: "HEAD" });
        return new Response(null, {
          status: upstream.ok ? 200 : 502,
          headers: headers(upstream.headers.get("content-length"), src.filename),
        });
      },

      GET: async () => {
        const src = await resolveSource();
        if (!src) {
          return new Response("No Android release published yet.", {
            status: 404,
            headers: { "Content-Type": "text/plain", ...corsHeaders },
          });
        }
        const upstream = await fetch(src.url);
        if (!upstream.ok || !upstream.body) {
          return new Response(`Upstream fetch failed [${upstream.status}]`, {
            status: 502,
            headers: { "Content-Type": "text/plain", ...corsHeaders },
          });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: headers(upstream.headers.get("content-length"), src.filename),
        });
      },
    },
  },
});
