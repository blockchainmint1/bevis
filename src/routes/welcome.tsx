import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logoAsset from "@/assets/bevis-logo.png.asset.json";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your account — BEVIS" },
      { name: "description", content: "Name your BEVIS account and start notarising records on the TEXITcoin blockchain." },
      { property: "og:title", content: "Set up your account — BEVIS" },
      { property: "og:description", content: "Two quick details and your record book is ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", replace: true });
  }, [ready, user, navigate]);

  async function finish(skip = false) {
    if (!user) return;
    setBusy(true);
    try {
      if (!skip && displayName.trim()) {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: user.id, display_name: displayName.trim() }, { onConflict: "id" });
        if (error) throw error;
      }
      navigate({ to: "/assets", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <img src={logoAsset.url} alt="BEVIS" className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 text-center font-serif text-3xl text-foreground">Welcome to BEVIS</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          What should we call you? You can change this any time in settings.
        </p>

        <form
          onSubmit={e => { e.preventDefault(); void finish(); }}
          className="mt-8 space-y-3 rounded-xl border border-border bg-card p-6"
        >
          <input
            autoFocus
            value={displayName}
            maxLength={60}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Setting up…" : "Start my record book"}
          </button>
          <button
            type="button"
            onClick={() => void finish(true)}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </form>
      </main>
    </div>
  );
}
