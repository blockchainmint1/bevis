/**
 * Record a new app release so installed apps see the update.
 *
 *   POST /api/public/hooks/publish-release
 *   headers: x-release-secret: <RELEASE_PUBLISH_SECRET>
 *   body: { platform, version, version_code?, ipfs_cid?, download_url?,
 *           sha256?, size_bytes?, notes?, mandatory? }
 *
 * Called by scripts/publish-release.sh after pinning the APK to IPFS.
 * Guarded by a shared secret compared in constant time.
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-release-secret",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function secretMatches(given: string | null): boolean {
  const expected = process.env["RELEASE_PUBLISH_SECRET"];
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const PLATFORMS = new Set(["android", "ios", "web"]);

export const Route = createFileRoute("/api/public/hooks/publish-release")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        if (!secretMatches(request.headers.get("x-release-secret"))) {
          return json({ error: "unauthorized" }, 401);
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid json" }, 400);
        }

        const platform = String(body["platform"] ?? "android").toLowerCase();
        const version = String(body["version"] ?? "").trim();
        if (!PLATFORMS.has(platform)) return json({ error: "invalid platform" }, 400);
        if (!/^[\w.+-]{1,64}$/.test(version)) return json({ error: "invalid version" }, 400);

        const cid = body["ipfs_cid"] ? String(body["ipfs_cid"]).trim() : null;
        const downloadUrl = body["download_url"] ? String(body["download_url"]).trim() : null;
        if (!cid && !downloadUrl) return json({ error: "ipfs_cid or download_url required" }, 400);
        if (downloadUrl && !/^https:\/\//.test(downloadUrl)) {
          return json({ error: "download_url must be https" }, 400);
        }

        const row = {
          platform,
          version,
          version_code: body["version_code"] ? Number(body["version_code"]) : null,
          ipfs_cid: cid,
          download_url: downloadUrl,
          sha256: body["sha256"] ? String(body["sha256"]).trim() : null,
          size_bytes: body["size_bytes"] ? Number(body["size_bytes"]) : null,
          notes: body["notes"] ? String(body["notes"]).slice(0, 2000) : null,
          mandatory: body["mandatory"] === true,
          released_at: new Date().toISOString(),
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("app_releases")
          .upsert(row, { onConflict: "platform,version" })
          .select("platform, version, released_at")
          .maybeSingle();

        if (error) {
          console.error("publish-release failed", error.message);
          return json({ error: "insert failed", detail: error.message }, 500);
        }
        return json({ ok: true, release: data });
      },
    },
  },
});
