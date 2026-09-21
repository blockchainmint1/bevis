/**
 * Stable, key-free release feed.
 *
 *   GET /api/public/latest-release?platform=android
 *
 * Installed apps must be able to ask "what's the newest build?" without an API
 * key baked into whatever old build they're running, so this endpoint is
 * public, CORS-open, and lives at a fixed path forever.
 */
import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

const PLATFORMS = new Set(["android", "ios", "web"]);

export const Route = createFileRoute("/api/public/latest-release")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = (url.searchParams.get("platform") || "android").toLowerCase();
        if (!PLATFORMS.has(platform)) {
          return new Response(JSON.stringify({ error: "invalid platform" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("app_releases")
          .select(
            "platform, version, version_code, ipfs_cid, download_url, sha256, size_bytes, notes, mandatory, released_at",
          )
          .eq("platform", platform)
          .order("released_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: "lookup failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ release: data ?? null }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
            ...corsHeaders,
          },
        });
      },
    },
  },
});
